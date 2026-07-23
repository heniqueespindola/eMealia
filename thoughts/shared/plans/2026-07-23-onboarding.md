---
data: 2026-07-23
feature: "Onboarding (3 Ecrãs)"
research: "thoughts/shared/research/2026-07-23-onboarding.md"
status: implementado_aguarda_verificacao_manual
---

# Spec: Onboarding (3 Ecrãs)

## Visão Geral
Implementa os 3 ecrãs de onboarding (`app/onboarding/step1.tsx`, `step2.tsx`, `step3.tsx`), um Zustand store para persistir o estado entre passos, dois novos campos em `profiles` (`onboarding_completo`, `frequencia_cozinha`), e um guard no root layout que redirecciona utilizadores conforme sessão + estado de onboarding.

## Decisões de arquitectura (confirmadas)
- **Estado entre passos:** Zustand store dedicado (`onboardingStore.ts`), gravação única no Supabase no fim do passo 3.
- **Guard:** implementado em `app/_layout.tsx` (root layout), central para toda a app.
- **Estilo:** `style={{}}` inline com tokens de `theme.ts` (padrão de `login.tsx`/`register.tsx`), substitui o `className`/NativeWind dos placeholders actuais.
- **`frequencia_cozinha`:** `int` (número de vezes por semana).

## Decisão de mapeamento — "filtros favoritos" do passo 3
O schema só tem **um** campo `profiles.filtros_dieteticos text[]`. O ticket pede selecção de "preferências dietéticas" no passo 1 E "filtros favoritos" no passo 3, ambos gravados em `profiles`. `FiltroDietetico` tem 9 valores; o ticket usa só 6 no passo 1 (`vegan`, `vegetariano`, `sem_gluten`, `sem_lactose`, `airfryer`, `rapida`), deixando 3 por atribuir (`fria`, `sobremesa`, `pequeno_almoco`).
**Decisão:** o passo 3 usa esses 3 valores restantes como "filtros favoritos" (preferências de conteúdo, não dietéticas). No submit final, as selecções do passo 1 e do passo 3 são unidas num único array e gravadas em `profiles.filtros_dieteticos` — não é criado nenhum campo novo para isto. Revê esta secção antes de aprovar a spec; é a única inferência não-literal do ticket.

## Ficheiros a Criar

### `apps/mobile/src/stores/onboardingStore.ts`
**Propósito:** estado partilhado entre os 3 passos (em memória, não persistido em disco).
```ts
import { create } from 'zustand';
import type { FiltroDietetico } from '@emealia/types';

interface OnboardingState {
  filtrosDieteticos:    FiltroDietetico[];
  ingredientesIniciais: string[];
  filtrosFavoritos:     FiltroDietetico[];
  frequenciaCozinha:    number | null;
  setFiltrosDieteticos:    (filtros: FiltroDietetico[]) => void;
  setIngredientesIniciais: (ingredientes: string[]) => void;
  setFiltrosFavoritos:     (filtros: FiltroDietetico[]) => void;
  setFrequenciaCozinha:    (frequencia: number) => void;
  reset: () => void;
}

const initialState = {
  filtrosDieteticos:    [] as FiltroDietetico[],
  ingredientesIniciais: [] as string[],
  filtrosFavoritos:     [] as FiltroDietetico[],
  frequenciaCozinha:    null as number | null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setFiltrosDieteticos:    (filtros)      => set({ filtrosDieteticos: filtros }),
  setIngredientesIniciais: (ingredientes) => set({ ingredientesIniciais: ingredientes }),
  setFiltrosFavoritos:     (filtros)      => set({ filtrosFavoritos: filtros }),
  setFrequenciaCozinha:    (frequencia)   => set({ frequenciaCozinha: frequencia }),
  reset:                   ()             => set(initialState),
}));
```

### `apps/mobile/src/stores/profileStore.ts`
**Propósito:** espelha o padrão de `authStore.ts` — guarda o `profile` carregado, acessível de forma reactiva por `app/_layout.tsx` (guard) e actualizável directamente pelo passo 3 após gravação (evita re-fetch e a race condition de o guard redireccionar de volta para o onboarding com dados desactualizados).
```ts
import { create } from 'zustand';
import type { Profile } from '@emealia/types';

interface ProfileState {
  profile:    Profile | null;
  loading:    boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile:    null,
  loading:    true,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));
```

### `apps/mobile/src/hooks/useProfile.ts`
**Propósito:** carrega o `profile` do utilizador autenticado e sincroniza com `profileStore`, seguindo exactamente o mesmo padrão que `useAuth.ts` usa para sincronizar `session` com `authStore`.
```ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@emealia/supabase';
import { useProfileStore } from '@/stores/profileStore';

export function useProfile(userId: string | undefined) {
  const profile = useProfileStore((s) => s.profile);
  const loading = useProfileStore((s) => s.loading);

  useEffect(() => {
    if (!userId) {
      useProfileStore.getState().setProfile(null);
      useProfileStore.getState().setLoading(false);
      return;
    }
    useProfileStore.getState().setLoading(true);
    getProfile(supabase, userId).then(({ data }) => {
      useProfileStore.getState().setProfile(data ?? null);
      useProfileStore.getState().setLoading(false);
    });
  }, [userId]);

  return { profile, loading };
}
```

### `packages/supabase/src/queries/profile.ts`
**Propósito:** segue o padrão de `queries/pantry.ts` (funções puras `(client, ...args) => promise`); hoje não existe nenhum helper para `profiles`, todo o acesso é inline nos ecrãs.
```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile } from '@emealia/types';

export async function getProfile(client: SupabaseClient<Database>, userId: string) {
  return client.from('profiles').select('*').eq('id', userId).single();
}

export async function updateProfile(
  client: SupabaseClient<Database>,
  userId: string,
  updates: Partial<Profile>
) {
  return client.from('profiles').update(updates).eq('id', userId).select().single();
}
```

### `apps/mobile/src/components/ui/Pill.tsx`
**Propósito:** componente de selecção múltipla (chip), reutilizado nos 3 passos. Não existe nenhum componente de selecção em `components/ui/` hoje.
```tsx
import { Pressable, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface PillProps {
  label:    string;
  selected: boolean;
  onPress:  () => void;
}

export function Pill({ label, selected, onPress }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical:   10,
        borderRadius:       radius.full,
        borderWidth:        1,
        borderColor:        selected ? colors.primary : colors.border,
        backgroundColor:    selected ? colors.primary : 'transparent',
        marginRight:        8,
        marginBottom:       8,
      }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: selected ? colors.primaryDark : colors.textPrimary }}>
        {label}
      </Text>
    </Pressable>
  );
}
```

### `apps/mobile/src/components/ui/StepIndicator.tsx`
**Propósito:** indicador de progresso (dots + texto "1/3") pedido nos critérios de aceitação, em âmbar `colors.primary`.
```tsx
import { View, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface StepIndicatorProps {
  current: number;
  total:   number;
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <View style={{ alignItems: 'center', marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={{
              width:  i + 1 === current ? 24 : 8,
              height: 8,
              borderRadius:    radius.full,
              backgroundColor: i + 1 <= current ? colors.primary : colors.border,
              marginHorizontal: 4,
            }}
          />
        ))}
      </View>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primaryDark }}>
        {current}/{total}
      </Text>
    </View>
  );
}
```

### `apps/mobile/src/constants/onboarding.ts`
**Propósito:** dados estáticos dos 3 passos — subconjuntos de `FILTROS_DIETETICOS`, sugestões de ingredientes comuns, opções de frequência de cozinha.
```ts
import { FILTROS_DIETETICOS } from '@emealia/config';
import type { FiltroDietetico } from '@emealia/types';

const STEP1_VALUES: FiltroDietetico[] = ['vegan', 'vegetariano', 'sem_gluten', 'sem_lactose', 'airfryer', 'rapida'];
const STEP3_VALUES: FiltroDietetico[] = ['fria', 'sobremesa', 'pequeno_almoco'];

export const OPCOES_PREFERENCIAS_DIETETICAS = FILTROS_DIETETICOS.filter((f) => STEP1_VALUES.includes(f.value));
export const OPCOES_FILTROS_FAVORITOS       = FILTROS_DIETETICOS.filter((f) => STEP3_VALUES.includes(f.value));

export const INGREDIENTES_COMUNS = [
  'Ovo', 'Massa', 'Arroz', 'Tomate', 'Cebola', 'Alho',
  'Batata', 'Azeite', 'Frango', 'Queijo', 'Leite', 'Pão',
];

export const OPCOES_FREQUENCIA_COZINHA = [
  { value: 1, label: '1x por semana' },
  { value: 3, label: '2-3x por semana' },
  { value: 5, label: '4-5x por semana' },
  { value: 7, label: 'Todos os dias' },
];
```

## Ficheiros a Modificar

### `supabase/schema.sql`
- [x] Na tabela `profiles` (linhas 5-16), adicionar duas colunas antes do `created_at`:
```sql
  frequencia_cozinha int CHECK (frequencia_cozinha BETWEEN 0 AND 7),
  onboarding_completo boolean DEFAULT false,
```
- Não há `supabase/migrations/`; edição directa do `schema.sql` (sem precedente de migrations no projecto). **Nota:** este ficheiro não corre automaticamente — o SQL tem de ser executado manualmente no Supabase Dashboard (SQL Editor) do projecto real após o merge.

### `packages/types/src/user.ts`
- [x] Adicionar dois campos à interface `Profile` (depois de `gdpr_consent_at`):
```ts
  frequencia_cozinha:    number | null;
  onboarding_completo:   boolean;
```

### `packages/supabase/src/index.ts`
- [x] Adicionar `export * from './queries/profile';`

### `packages/supabase/src/queries/pantry.ts`
- [x] Adicionar helper de bulk insert (usado no passo 2/3 para gravar todos os ingredientes iniciais de uma vez):
```ts
export async function addPantryItems(
  client: SupabaseClient<Database>,
  items: Omit<PantryItem, 'id' | 'created_at'>[]
) {
  return client.from('pantry_items').insert(items).select();
}
```

### `apps/mobile/app/_layout.tsx`
- [x] Adicionar guard de auth/onboarding. Substituir o conteúdo actual por:
```tsx
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import '../src/styles/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_700Bold,
  });

  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(session?.user?.id);
  const segments = useSegments();
  const router = useRouter();

  const authReady = fontsLoaded && !authLoading && (!session || !profileLoading);

  useEffect(() => {
    if (!authReady) return;

    const inAuthGroup   = segments[0] === '(auth)';
    const inOnboarding  = segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && !profile?.onboarding_completo && !inOnboarding) {
      router.replace('/onboarding/step1');
    } else if (session && profile?.onboarding_completo && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [authReady, session, profile, segments]);

  useEffect(() => {
    if (authReady) SplashScreen.hideAsync();
  }, [authReady]);

  if (!authReady) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
```
**Nota:** `authReady` só exige `profileLoading` resolvido quando há `session` (evita ficar bloqueado indefinidamente no ecrã de login, onde não há `userId` para o `useProfile` carregar).

### `apps/mobile/app/onboarding/step1.tsx`
- [x] Substituir o placeholder pelo ecrã completo:
  - Fundo `colors.bgLight`, `KeyboardAvoidingView` não é necessário (sem inputs de texto)
  - Título (fonts.display) "Bem-vindo(a) à eMealia" + subtítulo (fonts.regular) explicando o propósito, tom prático/encorajador em pt-PT
  - `StepIndicator current={1} total={3}`
  - Grid de `Pill` (flexWrap: 'wrap', flexDirection: 'row') a partir de `OPCOES_PREFERENCIAS_DIETETICAS`, selecção múltipla via `useState<FiltroDietetico[]>`
  - `Button label="Próximo"` sempre activo — `onPress`: `useOnboardingStore.getState().setFiltrosDieteticos(selecionados)`, depois `router.push('/onboarding/step2')`
  - Ao montar, inicializar `useState` a partir de `useOnboardingStore((s) => s.filtrosDieteticos)` para preservar selecção ao voltar atrás (critério de aceitação de navegação)

### `apps/mobile/app/onboarding/step2.tsx`
- [x] Substituir o placeholder:
  - Fundo `colors.bgLight`
  - Título "Vamos conhecer a tua despensa" + subtítulo
  - `StepIndicator current={2} total={3}`
  - Grid de `Pill` a partir de `INGREDIENTES_COMUNS` (strings simples, `label`/`selected`/`onPress` directos, sem mapear para objecto `{value,label}`)
  - `Button label="Próximo"` com `disabled={selecionados.length < 3}` (critério de aceitação)
  - `onPress`: `useOnboardingStore.getState().setIngredientesIniciais(selecionados)`, depois `router.push('/onboarding/step3')`
  - `useState` inicializado a partir de `useOnboardingStore((s) => s.ingredientesIniciais)`

### `apps/mobile/app/onboarding/step3.tsx`
- [x] Substituir o placeholder:
  - Fundo `colors.bgLight`
  - Título "Últimos detalhes" + subtítulo
  - `StepIndicator current={3} total={3}`
  - Grid de `Pill` a partir de `OPCOES_FILTROS_FAVORITOS` (selecção múltipla, opcional — sem mínimo)
  - Segunda secção: `Pill` a partir de `OPCOES_FREQUENCIA_COZINHA` como selecção **única** (seleccionar um desmarca os outros); estado `useState<number | null>`
  - `Button label="Concluir"` com `loading={loading}` e `disabled={frequencia === null}` (frequência é obrigatória para gravar `frequencia_cozinha`; filtros favoritos e nº de ingredientes já validados nos passos anteriores)
  - `handleConcluir`:
    ```ts
    const { filtrosDieteticos, ingredientesIniciais } = useOnboardingStore.getState();
    const filtrosUnidos = [...new Set([...filtrosDieteticos, ...filtrosFavoritosSelecionados])];

    await updateProfile(supabase, user.id, {
      filtros_dieteticos:  filtrosUnidos,
      frequencia_cozinha:  frequencia,
      onboarding_completo: true,
    });

    if (ingredientesIniciais.length > 0) {
      await addPantryItems(supabase, ingredientesIniciais.map((nome) => ({
        user_id: user.id, nome, quantidade: null, barcode: null, expira_em: null,
      })));
    }

    useProfileStore.getState().setProfile({
      ...useProfileStore.getState().profile!,
      filtros_dieteticos: filtrosUnidos,
      frequencia_cozinha: frequencia,
      onboarding_completo: true,
    });
    useOnboardingStore.getState().reset();
    router.replace('/(tabs)');
    ```
  - `user` vem de `useAuth()`; erros apanhados em `try/catch`, apresentados como `<Text>` em `colors.primaryDark` (padrão de `register.tsx`)
  - Imports: `updateProfile`, `addPantryItems` de `@emealia/supabase`; `useProfileStore` de `@/stores/profileStore`; `useOnboardingStore` de `@/stores/onboardingStore`

## Fases de Implementação

### Fase 1: Schema, tipos e queries — base de dados
**Ficheiros:**
- Modificar `supabase/schema.sql`
- Modificar `packages/types/src/user.ts`
- Criar `packages/supabase/src/queries/profile.ts`
- Modificar `packages/supabase/src/index.ts`
- Modificar `packages/supabase/src/queries/pantry.ts`

**Critérios de sucesso (automáticos):**
- [x] `npm run typecheck` (raiz) passa sem erros (apenas erros pré-existentes, confirmados via `git stash`; nenhum novo)
- [x] `Database['public']['Tables']['profiles']['Row']` inclui `frequencia_cozinha` e `onboarding_completo` (verificável por uso em `useProfile.ts` sem erro de tipo)

**Critérios de sucesso (manuais):**
- [ ] SQL de `schema.sql` corre sem erro no Supabase Dashboard (SQL Editor) do projecto de desenvolvimento

### Fase 2: Estado local — stores e hook de perfil
**Ficheiros:**
- Criar `apps/mobile/src/stores/onboardingStore.ts`
- Criar `apps/mobile/src/stores/profileStore.ts`
- Criar `apps/mobile/src/hooks/useProfile.ts`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` (apps/mobile) passa sem erros novos (usou-se `getProfile(supabase!, userId)` — non-null assertion, decisão acordada com o utilizador para resolver TS2345)

### Fase 3: Componentes UI e dados estáticos
**Ficheiros:**
- Criar `apps/mobile/src/components/ui/Pill.tsx`
- Criar `apps/mobile/src/components/ui/StepIndicator.tsx`
- Criar `apps/mobile/src/constants/onboarding.ts`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros novos
- [ ] `expo lint` sem warnings — não foi possível correr: o projecto não tem ESLint configurado (`expo lint` tenta auto-instalar e falha com erro de compatibilidade `ajv`/`eslintrc`, não relacionado com esta feature); alterações automáticas a `package.json`/`eslint.config.js` foram revertidas

**Critérios de sucesso (manuais):**
- [ ] `Pill` alterna visualmente entre estado seleccionado (fundo âmbar) e não seleccionado (contorno areia) ao tocar, num ecrã de teste isolado

### Fase 4: Guard de navegação no root layout
**Ficheiros:**
- Modificar `apps/mobile/app/_layout.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros novos

**Critérios de sucesso (manuais):**
- [ ] Sem sessão: abrir a app vai directo para `/(auth)/login`
- [ ] Com sessão e `onboarding_completo=false`: abrir a app vai directo para `/onboarding/step1` (mesmo tentando navegar manualmente para `/(tabs)`)
- [ ] Com sessão e `onboarding_completo=true`: abrir a app vai directo para `/(tabs)`, e navegar manualmente para `/onboarding/step1` ou `/(auth)/login` redirecciona de volta para `/(tabs)`
- [ ] Sem flash visível do ecrã errado antes do redirect (splash screen mantém-se até `authReady`)

### Fase 5: Ecrãs de onboarding
**Ficheiros:**
- Modificar `apps/mobile/app/onboarding/step1.tsx`
- Modificar `apps/mobile/app/onboarding/step2.tsx`
- Modificar `apps/mobile/app/onboarding/step3.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros novos
- [ ] `expo lint` sem warnings — ver nota na Fase 3 (ESLint não configurado no projecto)

**Critérios de sucesso (manuais):**
- [ ] Fluxo completo no simulador: registar conta nova → step1 (seleccionar 2 preferências) → "Próximo" → step2 (botão desactivado com 0-2 ingredientes, activa com 3+) → "Próximo" → step3 (seleccionar filtros favoritos + frequência) → "Concluir" → chega a `/(tabs)`
- [ ] Voltar de step2 para step1 (gesto/botão back) preserva as preferências já seleccionadas
- [ ] Após "Concluir", verificar no Supabase Dashboard: `profiles.filtros_dieteticos` contém a união dos passos 1+3, `profiles.frequencia_cozinha` gravado, `profiles.onboarding_completo=true`, e `pantry_items` tem uma linha por ingrediente seleccionado no passo 2
- [ ] Fechar e reabrir a app após concluir onboarding: vai directo para `/(tabs)`, onboarding não reaparece

## Estratégia de Testes
- **Unit:** não há suite de testes configurada no projecto (nenhum `*.test.ts` encontrado); não introduzir framework de testes nesta feature — fora de escopo do ticket.
- **Manual:** ver critérios de sucesso manuais de cada fase; testar em simulador iOS (ou Android) com conta Supabase de desenvolvimento real, incluindo o caso de reabrir a app depois de completar o onboarding.

## Notas de Implementação
- **Cliente Supabase pode ser `null`** (`apps/mobile/src/lib/supabase.ts:21`) se `.env` não tiver as variáveis — o padrão existente (`useAuth.ts`, `register.tsx`) não faz guard contra isto, assume-se `.env` sempre presente em dev/prod; os novos ficheiros seguem a mesma convenção, sem adicionar checks extra.
- **Mapeamento "filtros favoritos" → `filtros_dieteticos`** é uma inferência da spec (ver secção dedicada acima), não está explícito no ticket — confirmar antes de implementar caso o entendimento do produto seja diferente.
- **Guard só corre depois dos fonts carregados** — mantém o padrão actual de `SplashScreen.preventAutoHideAsync()`/`hideAsync()`, apenas adia o `hideAsync()` até `authReady` (sessão + perfil resolvidos).
- **`profileStore` existe separado de `useProfile`** especificamente para evitar a race condition em que o passo 3 grava `onboarding_completo=true` no Supabase mas o guard do root layout ainda vê o `profile` antigo em memória e redirecciona de volta para o onboarding — o `setProfile` optimista no fim do passo 3 resolve isto sem exigir um novo fetch.
- **`register.tsx` não é alterado** — continua a fazer `supabase.from('profiles').update(...)` inline em vez de usar o novo `updateProfile` helper; fora do escopo deste ticket, inconsistência pré-existente que fica registada mas não corrigida aqui.
- **GDPR/RLS:** nenhuma alteração às policies é necessária — `profiles` e `pantry_items` já têm RLS `FOR ALL USING (auth.uid() = id/user_id)`, cobre os novos campos e os inserts em bulk.

## Referências
- Research: `thoughts/shared/research/2026-07-23-onboarding.md`
- Ticket: `thoughts/shared/tickets/2026-07-23-onboarding.md`
- Padrão de ecrã de auth: `apps/mobile/app/(auth)/register.tsx`, `apps/mobile/app/(auth)/login.tsx`
- Padrão de Zustand store: `apps/mobile/src/stores/pantryStore.ts`, `apps/mobile/src/stores/authStore.ts`
- Padrão de query package: `packages/supabase/src/queries/pantry.ts`
