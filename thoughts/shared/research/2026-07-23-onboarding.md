---
data: 2026-07-23
feature: "Onboarding (3 Ecrãs)"
status: completo
---

# Research: Onboarding (3 Ecrãs)

## Questão de Pesquisa
Como estruturar o fluxo de onboarding de 3 passos em Expo Router (`app/onboarding/`), incluindo persistência de estado entre ecrãs, gravação final em `profiles`/`pantry_items` no Supabase, e o guard que impede reexibição do onboarding a utilizadores que já o completaram?

## Sumário
Os 3 ecrãs de onboarding já existem como **placeholders vazios** (`apps/mobile/app/onboarding/step1.tsx`, `step2.tsx`, `step3.tsx`, com um `_layout.tsx` de `Stack` simples) e o ponto de entrada já está ligado — `register.tsx` faz `router.replace('/onboarding/step1')` após o signup. Falta implementar: a UI e lógica dos 3 passos, um mecanismo de estado partilhado entre ecrãs, a gravação em `profiles`/`pantry_items`, e — criticamente — **dois campos que não existem no schema actual** (`onboarding_completo` e frequência de cozinha semanal) e o guard de rota que impede reexibição do fluxo.

## Ficheiros Relevantes da Codebase

### Navegação / ecrãs
- `apps/mobile/app/_layout.tsx:1-28` — root layout; carrega fontes (Inter + PlayfairDisplay); **sem nenhum guard de auth/onboarding** — é só `<Stack screenOptions={{ headerShown: false }} />` após `loaded`.
- `apps/mobile/app/onboarding/_layout.tsx` — `Stack` simples, `headerShown: false`, sem lógica condicional.
- `apps/mobile/app/onboarding/step1.tsx` — placeholder: `<Text>F02 — Boas-vindas + preferências dietéticas (1/3)</Text>` dentro de `<View className="flex-1 bg-bgLight items-center justify-center">`.
- `apps/mobile/app/onboarding/step2.tsx` — placeholder idêntico, texto "F02 — Primeiros ingredientes da despensa (2/3)".
- `apps/mobile/app/onboarding/step3.tsx` — placeholder idêntico, texto "F02 — Filtros favoritos (3/3)".
- `apps/mobile/app/(auth)/register.tsx:39-46` — **ponto de entrada já ligado**: após `signUp()`, faz update a `profiles.gdpr_consent`/`gdpr_consent_at` e `router.replace('/onboarding/step1')`.
- `apps/mobile/app/(auth)/login.tsx:1-82` e `register.tsx:1-126` — padrão de UI de referência (ver secção seguinte) para os novos ecrãs de onboarding.
- `apps/mobile/app/(tabs)/_layout.tsx` e `(auth)/_layout.tsx` — também sem guards; toda a navegação entre grupos é manual via `router.replace(...)`.

### Auth / estado
- `apps/mobile/src/hooks/useAuth.ts:1-41` — expõe `session`, `loading`, `user` (derivado de `session?.user`), `signIn`, `signUp`, `signOut`. **Não expõe `profile`** — quem precisa de dados de `profiles` faz o próprio query.
- `apps/mobile/src/stores/authStore.ts:1-17` — Zustand: `user`, `plan`. Sem estado de onboarding.
- `apps/mobile/src/stores/pantryStore.ts:1-17` — Zustand: `items`, `setItems`, `addItem`, `removeItem`, tipado com `PantryItem` de `@emealia/types`. Padrão simples sem middleware (`create<State>((set) => ({...}))`, sem `persist`).
- `apps/mobile/src/lib/supabase.ts:1-34` — cliente Supabase tipado com `Database`, storage via `expo-secure-store`; pode ser `null` se env vars ausentes.
- `apps/mobile/src/lib/authErrors.ts:1-11` — `getAuthErrorMessage(error)` traduz erros Supabase Auth para pt-PT.

### Componentes UI
- `apps/mobile/src/components/ui/Button.tsx:1-37` — `{ label, onPress, loading?, disabled?, variant? }`; `variant="primary"` = fundo `colors.primary` + texto `colors.primaryDark`.
- `apps/mobile/src/components/ui/Input.tsx:1-37` — `{ label, error? } & TextInputProps`.
- **Não existem**: `Card`, `Badge`, `Pill`, `Checkbox`, indicador de progresso/`StepIndicator`. As pastas `components/feed/`, `components/pantry/`, `components/recipe/` existem mas estão vazias. `packages/ui/src/` não tem componentes React Native.

### Theme
- `apps/mobile/src/constants/theme.ts:1-48` — `colors` (`primary: '#FFB162'`, `bgLight: '#EEE9DF'`, `bgDark`, `bgDarkAlt`, `border`, `textPrimary`, `textInverted`, `textMuted`, etc.), `fonts` (`display`, `regular`, `medium`, `semibold`, `bold`), `spacing`, `radius`.
- `packages/config/src/index.ts:1-48` — duplicado parcial de `colors` + constantes de negócio: `PLANS`, `LIMITS`, e **`FILTROS_DIETETICOS`** (lista de 9 `{ value, label }`, diretamente reutilizável nos passos 1 e 3).

## Padrões de Implementação Existentes

**Padrão de ecrã de auth** (`login.tsx`/`register.tsx`): estado local via `useState`, validação inline antes da chamada assíncrona, estilos inline via `style={{ ... }}` usando tokens de `@/constants/theme` (**não** usam `className`/NativeWind), erros apresentados como `<Text>` em `colors.primaryDark`, navegação pós-sucesso via `router.replace(...)`.

> Nota: os 3 placeholders de onboarding usam `className` (NativeWind), ao contrário de `login.tsx`/`register.tsx` que usam `style={{...}}` inline — inconsistência de padrão entre o que já existe nos placeholders e o padrão real usado nos ecrãs de auth já implementados.

**Padrão de update a `profiles`** (`register.tsx:39-45`):
```ts
await supabase
  .from('profiles')
  .update({ gdpr_consent: true, gdpr_consent_at: new Date().toISOString() })
  .eq('id', data.user.id);
```

**Padrão de query package (`packages/supabase/src/queries/pantry.ts`, completo)**:
```ts
export async function getPantry(client: SupabaseClient<Database>, userId: string) {
  return client.from('pantry_items').select('*').eq('user_id', userId).order('created_at', { ascending: false });
}
export async function addPantryItem(client: SupabaseClient<Database>, item: Omit<PantryItem, 'id' | 'created_at'>) {
  return client.from('pantry_items').insert(item).select().single();
}
export async function deletePantryItem(client: SupabaseClient<Database>, id: string) {
  return client.from('pantry_items').delete().eq('id', id);
}
```
Funções puras `(client, ...args) => promise`, sem try/catch interno. **Não existe `queries/profile.ts`** — todo o acesso a `profiles` no código actual é feito directamente com `supabase.from('profiles')` no próprio ecrã. `addPantryItem` só insere um registo de cada vez (sem helper de bulk insert).

**Padrão de Zustand store** (`pantryStore.ts`, completo):
```ts
export const usePantryStore = create<PantryState>((set) => ({
  items:      [],
  setItems:   (items) => set({ items }),
  addItem:    (item)  => set((s) => ({ items: [item, ...s.items] })),
  removeItem: (id)    => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));
```

## Tabelas/Queries Supabase Relevantes

`supabase/migrations/` está **vazia** — o estado actual das tabelas é exactamente o de `supabase/schema.sql` (não há migrations posteriores a considerar).

**`profiles`** (`supabase/schema.sql:5-16`):
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome               text,
  email              text NOT NULL,
  avatar_url         text,
  filtros_dieteticos text[]    DEFAULT '{}',
  plano              text      DEFAULT 'free' CHECK (plano IN ('free','premium_monthly','premium_annual')),
  revenuecat_id      text,
  gdpr_consent       boolean   DEFAULT false,
  gdpr_consent_at    timestamptz,
  created_at         timestamptz DEFAULT now()
);
```
Trigger `handle_new_user()` (`schema.sql:23-35`) cria automaticamente a linha em `profiles` (`id`+`email`) no signup — logo o onboarding faz sempre `UPDATE`, nunca `INSERT`. **Não existe campo para "onboarding completo" nem para "frequência de cozinha semanal"** em lado nenhum do repositório (schema, migrations, types, código).

**`pantry_items`** (`supabase/schema.sql:38-46`):
```sql
CREATE TABLE IF NOT EXISTS pantry_items (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nome        text        NOT NULL,
  quantidade  text,
  barcode     text,
  expira_em   date,
  created_at  timestamptz DEFAULT now()
);
```
Só `nome` é obrigatório — consistente com a nota do ticket de gravar apenas `nome` no passo 2.

**RLS** (única policy por tabela, `FOR ALL`):
```sql
-- profiles
CREATE POLICY "profiles: só o próprio" ON profiles FOR ALL USING (auth.uid() = id);
-- pantry_items
CREATE POLICY "pantry: só o próprio" ON pantry_items FOR ALL USING (auth.uid() = user_id);
```

**Tipos TypeScript** (`packages/types/src/user.ts`, `pantry.ts`) espelham exactamente o schema actual — `Profile` e `PantryItem` **não** têm campos de onboarding/frequência. `packages/types/src/database.ts` deriva `Database['profiles']`/`Database['pantry_items']` (Row/Insert/Update) directamente destas interfaces — qualquer novo campo tem de ser adicionado em `schema.sql` **e** em `user.ts` para propagar ao tipo `Database` usado pelo `SupabaseClient<Database>`.

`FiltroDietetico` (`packages/types/src/user.ts:3-12`) tem 9 valores; o ticket usa um subconjunto de 6 para o passo 1 (vegan, vegetariano, sem_gluten, sem_lactose, airfryer, rapida) — os restantes 3 (`fria`, `sobremesa`, `pequeno_almoco`) existem no tipo mas não estão no escopo do passo 1 do ticket.

## APIs Externas Relevantes
Não aplicável — esta feature não chama YouTube Data API, Spoonacular nem Open Food Facts. As sugestões de ingredientes comuns do passo 2 podem ser uma lista estática local (conforme já assinalado no ticket).

## Code Snippets de Referência

Navegação pós-sucesso e update a `profiles`, já em produção em `register.tsx` — padrão directamente reaproveitável no passo 3 do onboarding:
```ts
// apps/mobile/app/(auth)/register.tsx:39-46
const data = await signUp(email.trim(), password);
if (data.user) {
  await supabase
    .from('profiles')
    .update({ gdpr_consent: true, gdpr_consent_at: new Date().toISOString() })
    .eq('id', data.user.id);
}
router.replace('/onboarding/step1');
```

Lista de filtros dietéticos pronta a usar em passos 1 e 3 (`packages/config/src/index.ts:38-48`):
```ts
export const FILTROS_DIETETICOS = [
  { value: 'vegan',          label: 'Vegan' },
  { value: 'vegetariano',    label: 'Vegetariano' },
  { value: 'sem_gluten',     label: 'Sem Glúten' },
  { value: 'sem_lactose',    label: 'Sem Lactose' },
  { value: 'airfryer',       label: 'Airfryer' },
  { value: 'rapida',         label: 'Rápida (< 30min)' },
  { value: 'fria',           label: 'Sem cozedura' },
  { value: 'sobremesa',      label: 'Sobremesa' },
  { value: 'pequeno_almoco', label: 'Pequeno-almoço' },
] as const;
```

## Questões em Aberto

1. **Campo de conclusão do onboarding não existe** — precisa de ser adicionado a `profiles` (ex.: `onboarding_completo boolean DEFAULT false`) em `schema.sql` (e reflectido em `packages/types/src/user.ts` → `Profile` → `Database`). A pasta `supabase/migrations/` está vazia, portanto não há precedente no projecto de como/se as alterações de schema devem passar por uma migration nova vs. edição directa de `schema.sql`.
2. **Campo de "frequência de cozinha semanal" não existe** — decidir tipo (`int`, enum, ou reaproveitar outro campo) e nome, e adicioná-lo da mesma forma que o ponto 1.
3. **Onde implementar o guard de "onboarding já completo"** — hoje não há nenhum guard de auth nem de onboarding em nenhum `_layout.tsx`. Precisa de decisão de arquitectura: ler `profiles.onboarding_completo` onde (root layout? layout do grupo `onboarding`? um hook `useAuth`/`useProfile` novo?), e como evitar flash de conteúdo errado enquanto a sessão/perfil carrega.
4. **`useAuth` não expõe `profile`** — só expõe `session`/`user`. Se o guard ou os ecrãs de onboarding precisarem de `filtros_dieteticos`/`onboarding_completo`, é preciso decidir se se estende `useAuth`, se se cria um hook novo (`useProfile`), ou se cada ecrã faz o próprio `select` a `profiles` (como `register.tsx` já faz para `update`).
5. **Persistência de estado entre os 3 passos** — não existe padrão já estabelecido no projecto (sem `onboardingStore.ts`). Decidir entre: estado local passado via params de rota, um novo Zustand store dedicado (seguindo o padrão simples de `pantryStore.ts`), ou gravação incremental no Supabase a cada passo (vs. gravação única no fim, como o ticket actualmente descreve).
6. **Inconsistência de estilo**: os placeholders actuais usam `className` (NativeWind), mas `login.tsx`/`register.tsx` (o padrão de facto dos ecrãs de auth já implementados) usam `style={{...}}` inline com tokens de `theme.ts`. Precisa de decisão de qual padrão seguir nos novos ecrãs de onboarding.
7. **Componente `Pill`/indicador de progresso não existe** — só `Button` e `Input` estão implementados em `src/components/ui/`. Serão precisos de raiz: um componente de selecção múltipla (chips/pills) para os passos 1/2/3, e um indicador de progresso (1/3, 2/3, 3/3).
8. **Gravação em `pantry_items` no passo 2** — `addPantryItem` em `packages/supabase/src/queries/pantry.ts` só insere um registo de cada vez; para gravar ≥3 ingredientes de uma vez é preciso decidir entre `insert([...])` em bulk (novo helper) ou `Promise.all` de chamadas individuais ao helper existente.
