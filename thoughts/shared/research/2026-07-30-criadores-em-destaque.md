---
data: 2026-07-30
feature: "Criadores em Destaque"
status: completo
---

# Research: Criadores em Destaque

## Questão de Pesquisa
Como identificar criadores de forma estável a partir de `video_cache` (nova coluna `creator_channel_id` vs. tabela `creators` dedicada), se "criadores em destaque" é um subconjunto curado com dados próprios (avatar, nº receitas, especialidade) ou derivado do universo de `video_cache`, como construir a infra de push notifications ainda inexistente no projecto (registo de token, tabela/coluna, Edge Function de envio) e qual o mecanismo de disparo quando `video_cache` recebe um novo vídeo de um criador seguido.

## Sumário
Não existe qualquer vestígio de "criador"/"seguir"/push notifications no repo — a feature é 100% nova. O padrão mais próximo a reaproveitar é `saved_recipes` (favoritos): tabela com `UNIQUE(user_id, <id>)` + RLS `auth.uid() = user_id`, camada de queries pura em `packages/supabase/src/queries/`, store Zustand + hook em `apps/mobile/src/`, botão de toggle inline (sem componente `FollowButton` genérico hoje). `video_cache` não tem id de canal nem RLS (é tabela partilhada sem dono); popular/actualizar essa tabela não tem processo nenhum no código — é schema puro. A infra de push (token, tabela, Edge Function) tem de ser construída de raiz, seguindo o padrão oficial Supabase+Expo: coluna `expo_push_token` em `profiles`, tabela de eventos + Database Webhook → Edge Function → API do Expo.

## Ficheiros Relevantes da Codebase

- `supabase/schema.sql:6-19` — tabela `profiles` (base) e `:156-168` (colunas F10 acrescentadas via `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`) — padrão a seguir para extensões futuras (ex: `expo_push_token`)
- `supabase/schema.sql:67-90` — tabela `saved_recipes` + RLS — padrão directo para `followed_creators`
- `supabase/schema.sql:138-151` — tabela `video_cache`, comentário explícito `-- Video Cache (partilhado — sem RLS de utilizador)`, sem `ALTER TABLE ... ENABLE ROW LEVEL SECURITY`
- `packages/supabase/src/queries/recipes.ts:1-49` — camada de queries puras (`getSavedRecipes`, `saveRecipe`, `unsaveRecipe`), recebem `client: SupabaseClient<Database>` como 1º argumento
- `packages/supabase/src/queries/feed.ts:1-15` — `getFeed(client, filtro?, limit)`, query a `video_cache` com `.contains('filtros', [filtro])`
- `apps/mobile/src/hooks/useFeed.ts:1-46` — hook do feed da homepage, com fallback para `MOCK_VIDEOS` quando `video_cache` devolve vazio
- `apps/mobile/src/stores/savedRecipesStore.ts:1-33` — store Zustand com `items`, `loading`, `loadedUserId` (evita refetch), updates "confirm-then-update" (não optimistic antes da rede)
- `apps/mobile/src/hooks/useSavedRecipes.ts:1-69` — hook que liga store + queries, `save()`/`unsave()` só actualizam a store após sucesso da rede
- `apps/mobile/src/components/recipe/RecipeCard.tsx:63-66` — botão de toggle inline (ícone `heart`/`heart-outline`), controlado pelo pai via props `saved`/`onToggleSave` — **não existe** `FollowButton`/`SaveButton` reutilizável
- `apps/mobile/app/(tabs)/search.tsx:28,31-35,75-108,138` — lógica de limite de plano free aplicada no ecrã (client-side, não em DB): `Map<recipe_id, saved_recipe.id>` local + comparação com `LIMITS.free.saved_recipes`
- `apps/mobile/app/(tabs)/favoritos.tsx:1-158` — ecrã de listagem com `Pill` para filtrar por coleção, `FlatList`, modais — padrão inspirador para um ecrã "Criadores seguidos"/"Criadores em Destaque"
- `apps/mobile/src/components/paywall/PremiumLock.tsx:1-27` — componente "burro" (`mensagem: string`), gate total do ecrã (`if (!podeAceder) return <PremiumLock ... />`), sem overlay parcial
- `apps/mobile/app/(tabs)/planner.tsx:27-28,71` e `apps/mobile/app/macros.tsx:36,79` — uso de `PremiumLock` com `PLANS[profile.plano].features.<flag>`
- `apps/mobile/app/(tabs)/_layout.tsx` — 6 tabs fixas via `Tabs` do `expo-router`; **não existe** `SegmentedControl` nem padrão de tabs internas dentro de um ecrã em todo o `apps/mobile`
- `apps/mobile/app/(tabs)/index.tsx:41-53` — padrão de "alternador de vista" dentro da homepage: `FEED_FILTER_OPTIONS.map(opcao => <Pill selected={...} onPress={...} />)` a mudar o argumento passado a `useFeed` — é o padrão mais próximo de uma futura tab "A seguir"
- `packages/config/src/index.ts:21-65` — `PLANS` (feature flags por plano) e `LIMITS` (`{ free: { pantry_items, saved_recipes, daily_feed }, premium: { ...Infinity } }`) — não tem chave para criadores seguidos
- `supabase/functions/youtube-feed/index.ts` (25 linhas, completo) — única function relacionada com vídeos; faz proxy directo a `youtube/v3/search` e devolve o JSON ao cliente, **não escreve em `video_cache`**
- `supabase/functions/` — restantes functions (`autocomplete-ingredients`, `recipe-ingredients`, `revenuecat-webhook`, `search-recipes`) sem relação com vídeos/notificações
- `packages/types/src/database.ts:11-62` — `Database['public']['Tables']` **escrito manualmente** (não gerado pela CLI Supabase), usa helper `Simplify<T>`; adicionar tabela nova exige entrada manual aqui + interface de domínio num ficheiro próprio + export via `packages/types/src/index.ts`
- `packages/types/src/feed.ts:5-18` — `VideoItem`, espelha `video_cache`, sem qualquer campo de id de canal

## Padrões de Implementação Existentes

**Tabela de relação "seguir/guardar" com RLS** (`supabase/schema.sql:67-90`):
```sql
CREATE TABLE IF NOT EXISTS saved_recipes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipe_id text NOT NULL,
  ...
  UNIQUE(user_id, recipe_id)
);
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "saved_recipes: só o próprio" ON saved_recipes;
CREATE POLICY "saved_recipes: só o próprio"
  ON saved_recipes FOR ALL USING (auth.uid() = user_id);
```
Mesmo padrão em `pantry_items` (`:56-58`) e `macro_daily_totals` (`:186-188`) — sempre `FOR ALL USING (auth.uid() = user_id)` com `DROP POLICY IF EXISTS` antes, garantindo idempotência do `schema.sql`.

**Queries puras** (`packages/supabase/src/queries/recipes.ts`):
```ts
export async function saveRecipe(client: SupabaseClient<Database>, payload: SaveRecipeInput) {
  return client.from('saved_recipes').insert(payload).select().single();
}
export async function unsaveRecipe(client: SupabaseClient<Database>, id: string) {
  return client.from('saved_recipes').delete().eq('id', id);
}
```

**Hook + store (confirm-then-update, sem optimistic antes da rede)** (`apps/mobile/src/hooks/useSavedRecipes.ts`):
```ts
async function save(payload: SaveRecipeInput) {
  const { data, error } = await saveRecipe(supabase, payload);
  if (error) { console.error(error); return; }
  store.addItem(data);
}
```

**Botão de toggle inline, controlado pelo pai** (`apps/mobile/src/components/recipe/RecipeCard.tsx:63-66`):
```tsx
<Pressable onPress={onToggleSave} style={{ padding: spacing.sm }}>
  <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={colors.primary} />
</Pressable>
```

**Limite de plano aplicado no ecrã, não na DB** (`apps/mobile/app/(tabs)/search.tsx`):
```ts
const limit = profile?.plano === 'free' ? LIMITS.free.saved_recipes : LIMITS.premium.saved_recipes;
const limitReached = savedMap.size >= limit;
// dentro de handleToggleSave: if (limitReached) return;
```

**Gate Premium total do ecrã** (`apps/mobile/app/(tabs)/planner.tsx`):
```ts
const podeAceder = profile ? PLANS[profile.plano].features.planeamento_semanal : false;
if (!podeAceder) return <PremiumLock mensagem="..." />;
```

## Tabelas/Queries Supabase Relevantes

- `profiles` — sem coluna de push token nem de criador/seguir. Extensão idempotente segue o padrão de `schema.sql:156-168` (F10): bloco `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ...` isolado e comentado por feature.
- `video_cache` — **sem RLS**, **sem coluna de id de canal** (só `canal` texto livre e `youtube_id` = id do vídeo, não do canal), **sem processo de escrita** documentado no repo (nenhum INSERT/UPDATE encontrado; população é externa/manual/fora deste código).
- `saved_recipes` — modelo directo a replicar para `followed_creators` (`UNIQUE(user_id, <id_criador>)`, RLS `auth.uid() = user_id`).
- `packages/types/src/database.ts` — checklist ao adicionar tabela nova: (1) interface de domínio em `packages/types/src/<nome>.ts`, (2) entrada manual em `Database['public']['Tables']`, (3) export em `packages/types/src/index.ts`. Nada disto é automático.

## APIs Externas Relevantes

**YouTube Data API v3 — `channels.list`**
- Parâmetros relevantes: `id` ou `forHandle`, `part=snippet,statistics`
- `snippet` devolve título, descrição e thumbnails/avatar do canal
- `statistics` devolve `subscriberCount` e `videoCount`
- **Custo: 1 unidade de quota por chamada** (muito mais barato que `search.list`, que já é usado no projecto e custa 100 unidades/chamada por `CLAUDE.md`)
- Relevante para popular avatar/nome/nº de vídeos de um criador a partir do seu `channel id`, se se optar por buscar estes dados via API em vez de curadoria 100% manual

**Expo Push Notifications + Supabase (padrão oficial Supabase docs)**
- Token guardado tipicamente como coluna `expo_push_token` em `profiles`
- Fluxo recomendado: tabela de eventos (ex: `notifications`) → Database Webhook no Supabase Dashboard (evento `INSERT`, método POST, timeout 1000ms) → Edge Function → chamada a `https://exp.host/--/api/v2/push/send` com `Authorization: Bearer <EXPO_ACCESS_TOKEN>` (secret de ambiente na Edge Function, `verify_jwt = false` no webhook)
- Alternativa a Database Webhook: trigger de Postgres + `pg_net` a invocar a Edge Function directamente (Postgres não pode chamar APNs/FCM/Expo directamente)
- `expo-notifications` já está no `apps/mobile/package.json` (`~0.31.5`) mas não é importado em nenhum ficheiro nem está no array `expo.plugins` do `app.json` — registo de token no dispositivo (`registerForPushNotificationsAsync`) está totalmente por implementar

## Code Snippets de Referência

Edge Function de envio (padrão Supabase docs, adaptar `to`/`body` ao evento "novo vídeo de criador seguido"):
```ts
const { data } = await supabaseAdmin
  .from('profiles')
  .select('expo_push_token')
  .eq('id', payload.record.user_id)
  .single();

await fetch('https://exp.host/--/api/v2/push/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
  },
  body: JSON.stringify({ to: data?.expo_push_token, sound: 'default', body: payload.record.body }),
});
```

## Questões em Aberto

1. **Identificador de criador**: adicionar `channel_id`/`creator_channel_id` a `video_cache` (exige alterar o processo — ainda inexistente no repo — que popula essa tabela), ou criar tabela `creators` dedicada com id próprio e mapear vídeos por `canal` (texto, frágil a inconsistências de grafia)?
2. **Fonte de "criadores em destaque"**: é uma lista curada manualmente (avatar, especialidade, nº receitas geridos à mão, sem qualquer API) ou os dados vêm de `channels.list` da YouTube Data API (1 unidade/chamada, barato) cruzados com uma lista de channel ids parceiros?
3. **Quem escreve em `video_cache`**: não há processo de escrita nesta tabela em todo o repo. Antes de desenhar "notificação quando criador seguido publica novo vídeo", é preciso decidir/descobrir como e onde `video_cache` é (ou vai passar a ser) populada — sem isso não há evento de "INSERT" para disparar a notificação.
4. **Mecanismo de disparo da notificação**: trigger Postgres + `pg_net` sobre `INSERT` em `video_cache`, vs. Database Webhook nativo do Supabase Dashboard, vs. job periódico que compara `cached_at`. Depende directamente da resposta à questão 3.
5. **Registo de push token no cliente**: onde/quando pedir permissão e chamar `registerForPushNotificationsAsync` (ex: no primeiro follow de um criador, no onboarding, ou logo no login) — não há precedente no código actual.
6. **Limite de criadores seguidos no plano free**: seguir o padrão de `LIMITS` em `packages/config/src/index.ts` (como `saved_recipes: 10`) ou deixar ilimitado em todos os planos? Não há indicação no ticket original.
7. **`followed_creators.creator_channel_id`**: com ou sem FK — depende da resposta à questão 1 (se existir tabela `creators`, faz sentido FK; se for só uma string livre replicada de `video_cache.canal`, não há tabela-alvo para referenciar).
