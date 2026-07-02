---
data: 2026-07-02
feature: "Autenticação (F01) — login, registo e protecção de rotas"
status: completo
---

# Research: Autenticação (F01)

## Questão de Pesquisa
Como implementar ecrãs de login e registo com Supabase Auth (email + password) na app mobile eMealia, com redireccionamento automático para a homepage após login e protecção de rotas para utilizadores não autenticados, seguindo a paleta e tipografia da marca?

## Sumário
O scaffolding já existe mas está todo em placeholder: ecrãs `login.tsx`/`register.tsx` só mostram um título, `useAuth.ts` já expõe `session`/`user`/`loading` correctamente ligado ao Supabase, `authStore.ts` (Zustand) existe mas não está ligado a nada, e não há nenhuma lógica de submit, validação, nem protecção de rotas no `app/_layout.tsx`. O schema Supabase já tem um trigger `handle_new_user` que cria a linha em `profiles` automaticamente após signup — não é preciso fazer isso a partir do cliente. `expo-router` está na versão `4.0.22`, que **não** tem `<Stack.Protected>` (feature de versões mais recentes) — a protecção de rotas tem de ser feita com o padrão `<Redirect />` clássico.

## Ficheiros Relevantes da Codebase

- `apps/mobile/app/(auth)/login.tsx` — placeholder, só título "eMealia", sem form
- `apps/mobile/app/(auth)/register.tsx` — placeholder, só título "Criar conta", sem form
- `apps/mobile/app/(auth)/_layout.tsx` — `Stack` simples sem header, sem lógica
- `apps/mobile/app/_layout.tsx:9-31` — root layout; carrega fontes (Inter + PlayfairDisplay-Bold), regista `(auth)`, `(tabs)`, `onboarding` como screens do Stack raiz, mas **não tem nenhuma lógica de auth/redirect**
- `apps/mobile/app/(tabs)/_layout.tsx` — tabs (Início, Pesquisar, Despensa, Plano, Perfil), usa `colors` de `@/constants/theme`; não está protegido
- `apps/mobile/src/hooks/useAuth.ts` — **já funcional**: subscreve `supabase.auth.getSession()` + `onAuthStateChange`, devolve `{ session, loading, user }`. Não tem `signIn`/`signUp`/`signOut` (o ticket pedia isso — a decidir se se adiciona aqui ou nos ecrãs directamente)
- `apps/mobile/src/stores/authStore.ts` — Zustand store com `user`, `plan`, `setUser`, `setPlan`; existe mas **não está ligado** a `useAuth` nem a nenhum componente ainda
- `apps/mobile/src/lib/supabase.ts` — cliente Supabase já configurado com `expo-secure-store` como storage adapter, `persistSession: true`, `autoRefreshToken: true`, tipado com `Database` de `@emealia/types`. **Usar este cliente directamente, não criar outro.**
- `apps/mobile/src/constants/theme.ts` — tokens `colors`, `fonts`, `spacing`, `radius` já definidos exactamente como no CLAUDE.md
- `apps/mobile/tailwind.config.js` — nativewind configurado; só regista `bgDark`, `bgDarkAlt`, `border`, `bgLight`, `primary`, `primaryDark` nas cores (não regista `textMuted`, `youtube`, etc. — usar `style` inline ou `colors.ts` directamente para essas)
- `apps/mobile/src/components/ui/`, `apps/mobile/src/components/pantry/`, `.../recipe/`, `.../feed/` — **pastas vazias**, não há nenhum componente `Button`/`Input`/`Card` reutilizável ainda. Terás de criar os componentes de formulário de raiz para esta feature (ou fazer inline nos ecrãs, dado que é a primeira feature UI a ser implementada)
- `packages/ui/src` — **vazio**, não há design system partilhado ainda
- `apps/mobile/src/hooks/usePantry.ts` — bom exemplo do padrão de hook usado no projecto (useState + useEffect + funções async que chamam `supabase.from(...)`)
- `apps/mobile/app/(tabs)/index.tsx`, `pantry.tsx`, `search.tsx`, `planner.tsx`, `profile.tsx` — não inspecionados em detalhe, mas são o destino do redirect pós-login (`(tabs)/index` = homepage)

## Padrões de Implementação Existentes

Padrão de hook Supabase (de `usePantry.ts`):
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function usePantry(userId: string) {
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('pantry_items').select('*')...
      setItems(data ?? []);
      setLoading(false);
    }
    fetch();
  }, [userId]);

  async function add(item) { ... }
  return { items, loading, add, remove };
}
```

Padrão de layout de rota (Stack sem header, `(auth)/_layout.tsx`):
```typescript
import { Stack } from 'expo-router';
export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

Padrão de import de tema (`(tabs)/_layout.tsx`):
```typescript
import { colors } from '@/constants/theme';
```

Ecrãs actuais usam **NativeWind** (`className="flex-1 bg-bgDark items-center justify-center"`) e não StyleSheet — seguir este padrão para consistência, usando as classes já registadas no `tailwind.config.js` (`bg-bgDark`, `bg-primary`, `text-white`, etc.). Para `fonts.display`/`fonts.regular` (PlayfairDisplay-Bold / Inter) não há classes tailwind de `fontFamily` configuradas — terás de usar `style={{ fontFamily: fonts.display }}` inline ou adicionar `fontFamily` ao `tailwind.config.js`.

## Tabelas/Queries Supabase Relevantes

`profiles` (`supabase/schema.sql:5-16`):
```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome text, email text NOT NULL, avatar_url text,
  filtros_dieteticos text[] DEFAULT '{}',
  plano text DEFAULT 'free' CHECK (plano IN ('free','premium_monthly','premium_annual')),
  revenuecat_id text,
  gdpr_consent boolean DEFAULT false,
  gdpr_consent_at timestamptz,
  created_at timestamptz DEFAULT now()
);
```
RLS: `auth.uid() = id` (só o próprio utilizador acede à sua linha).

**Trigger já existente** (`supabase/schema.sql:22-35`) — cria automaticamente a linha em `profiles` quando um novo utilizador é criado em `auth.users`:
```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```
→ Isto significa que o critério de aceitação do ticket "Criação automática de registo em `profiles` após signup" **já está coberto no schema**, desde que este schema já tenha sido corrido no projecto Supabase (confirmar). Não precisa de chamada explícita do cliente.

`gdpr_consent` / `gdpr_consent_at` — colunas existem mas nada no código actual as popula. Se o registo desta feature deve capturar consentimento GDPR, é preciso um `update` explícito em `profiles` após signup (ex: checkbox "Aceito os termos" no ecrã de registo).

Não existem migrations versionadas em `supabase/migrations/` — o schema é aplicado manualmente via `supabase/schema.sql` no SQL Editor do Supabase Dashboard.

Não há `packages/supabase/src/queries/auth.ts` — as queries existentes em `packages/supabase/src/queries/` são só `pantry.ts`, `recipes.ts`, `feed.ts`. Segundo a regra do CLAUDE.md ("lógica de negócio e queries → `packages/`"), pode fazer sentido colocar `signIn`/`signUp`/`signOut` num novo `packages/supabase/src/queries/auth.ts` partilhável entre mobile e web — mas o `useAuth.ts` actual já chama `supabase.auth.*` directamente do hook em `apps/mobile`, sem passar por `packages/supabase`. É uma decisão em aberto (ver secção seguinte).

## Ambiente e Configuração

- `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` já preenchidos em `.env.example` (projecto Supabase real: `nbohketkwzgicvyjfroc.supabase.co`)
- `expo-secure-store` já é o storage adapter da sessão (`src/lib/supabase.ts:9-13`) — sessão persiste entre reinícios sem trabalho adicional
- `expo-router` versão instalada: **4.0.22** (confirmado em `node_modules/expo-router/package.json`) — expõe `Redirect`, `useRouter`, `useSegments`, `Slot`, `Navigator`, mas **não** expõe `Stack.Protected` (introduzido só em versões posteriores do expo-router). A protecção de rotas deve seguir o padrão clássico: verificar `session`/`loading` num layout e usar `<Redirect href="/(auth)/login" />` (ou para `(tabs)`) em vez de guard declarativo no `<Stack.Screen>`.
- Nota: há uma disparidade de versões entre `expo` (`~55.0.0`, tal como referido no CLAUDE.md) e `expo-router` (`~4.0.0`, tipicamente emparelhado com Expo SDK ~50-52) — não é para corrigir nesta fase de research, mas é relevante para o `/plan` decidir se a protecção de rotas usa o padrão `Redirect` (compatível com a versão instalada) e não assumir APIs de versões mais recentes.

## Code Snippets de Referência

`useAuth.ts` actual (mobile) — já pronto para consumir `session`/`user`/`loading`:
```typescript
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  return { session, loading, user: session?.user ?? null };
}
```
Falta: `signIn(email, password)`, `signUp(email, password)`, `signOut()` — chamadas directas a `supabase.auth.signInWithPassword` / `supabase.auth.signUp` / `supabase.auth.signOut`.

`authStore.ts` (Zustand, não ligado a nada ainda):
```typescript
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  plan: 'free',
  setUser: (user) => set({ user }),
  setPlan: (plan) => set({ plan }),
}));
```

Web app tem equivalente em Next.js (fora do escopo desta feature, mas mostra o padrão paralelo já iniciado): `apps/web/app/(auth)/login/page.tsx` e `register/page.tsx` são placeholders idênticos; `apps/web/lib/supabase/client.ts` e `server.ts` usam `@supabase/ssr` com `createBrowserClient`/`createServerClient`.

## Questões em Aberto

1. **Onde vive a lógica de signIn/signUp/signOut?** — directamente nos ecrãs via `supabase.auth.*`, dentro de `useAuth.ts` (expandir o hook actual), ou em `packages/supabase/src/queries/auth.ts` para ser reutilizável entre mobile e web? O CLAUDE.md indica "lógica de negócio e queries → `packages/`", mas o `useAuth.ts` actual já quebra esse padrão ao chamar `supabase.auth` directamente no hook local.
2. **Papel do `authStore.ts` (Zustand)** — deve ser sincronizado com `useAuth`/`onAuthStateChange` (ex: `setUser` chamado dentro do listener), ou é usado apenas para dados adicionais como `plan`? Actualmente não há nenhuma ligação entre os dois.
3. **Confirmar que `supabase/schema.sql` já foi executado no projecto real** (`nbohketkwzgicvyjfroc.supabase.co`) — se sim, o trigger `handle_new_user` já cobre a criação do perfil e não é preciso código adicional no cliente.
4. **Consentimento GDPR no registo** — o ticket não define claramente se um checkbox de consentimento faz parte desta feature ou de uma fase legal/onboarding separada. As colunas `gdpr_consent`/`gdpr_consent_at` existem no schema mas nada as popula hoje.
5. **Confirmar destino do redirect pós-registo**: homepage directa (`(tabs)/index`) ou `onboarding/step1`? O CLAUDE.md lista onboarding como F02 separada, e a pasta `app/onboarding/` já existe com 3 steps placeholder.
6. **Componentes de UI reutilizáveis** (`Button`, `Input`) — não existem ainda em `src/components/ui/` nem em `packages/ui/`. Decidir no `/plan` se se criam componentes mínimos reutilizáveis nesta feature (dado que login/registo precisam de inputs e botões) ou se ficam inline nos dois ecrãs.
7. **Versão do expo-router (4.0.22) vs Expo 55 referido no CLAUDE.md** — mismatch a ter em conta ao escolher a API de protecção de rotas (usar `<Redirect />`, não `<Stack.Protected>`).
