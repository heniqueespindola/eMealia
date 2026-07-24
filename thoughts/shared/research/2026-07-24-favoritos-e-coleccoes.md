---
data: 2026-07-24
feature: "Favoritos e Coleções"
status: completo
---

# Research: Favoritos e Coleções

## Questão de Pesquisa
Como estruturar o ecrã de favoritos e coleções (F06), incluindo se o campo `colecao` (texto livre) em `saved_recipes` é suficiente para suportar nomes personalizados e eliminação de coleções ou se é necessária uma tabela `collections` separada, como implementar a reatribuição de receitas para "Favoritos" ao eliminar uma coleção, a integração do botão de acesso rápido (embed YouTube vs. abertura externa por fonte), a aplicação do limite de 10 receitas do plano Grátis, e onde encaixar este ecrã na navegação (`app/(tabs)/`)?

## Sumário
Já existe uma implementação **parcial** desta feature: a tabela `saved_recipes` e as queries `getSavedRecipes`/`saveRecipe`/`unsaveRecipe` já estão prontas, e o toggle de "guardar" (coração) já funciona no ecrã de pesquisa (`search.tsx`) — mas gravando sempre na coleção `'favoritos'` com `fonte: 'spoonacular'` hardcoded, e **sem qualquer verificação do limite de 10 receitas** já definido em `LIMITS.free.saved_recipes`. Falta construir de raiz: o ecrã de listagem/gestão de favoritos, o conceito de gestão de coleções (criar/eliminar/mover, hoje só existe o campo texto `colecao` sem UI nenhuma à volta), a query `updateSavedRecipe` (não existe ainda), o gate de limite de plano nesta funcionalidade, e o botão de acesso à fonte original (não existe nenhum embed de YouTube nem abertura de browser externo implementado em lado nenhum do repo ainda).

## Ficheiros Relevantes da Codebase
- `supabase/schema.sql:67-88` — tabela `saved_recipes` (schema completo, ver abaixo) + RLS
- `packages/types/src/recipe.ts:37-49` — interface `SavedRecipe`
- `packages/types/src/database.ts:26-31` — mapeamento `Database['public']['Tables']['saved_recipes']`
- `packages/config/src/index.ts:26-35` — `LIMITS.free.saved_recipes = 10` / `LIMITS.premium.saved_recipes = Infinity` (já definido, ainda não consumido nesta feature)
- `packages/supabase/src/queries/recipes.ts` — `getSavedRecipes(client, userId, colecao?)`, `saveRecipe(client, recipe)`, `unsaveRecipe(client, id)` já implementados; **falta `updateSavedRecipe`** para suportar "mover entre coleções"
- `apps/mobile/app/(tabs)/search.tsx:16,33-36,65-91` — ponto de entrada actual de "guardar receita" (toggle no `RecipeCard`), sem gate de limite
- `apps/mobile/src/components/recipe/RecipeCard.tsx` (67 linhas) — card de receita com toggle de guardar (`Ionicons heart`/`heart-outline`), a reutilizar/adaptar para o ecrã de favoritos
- `apps/mobile/src/components/recipe/FilterRow.tsx` (25 linhas) — mapeia `FILTROS_DIETETICOS` para `Pill`, padrão a seguir para o filtro por filtro dietético do F06
- `apps/mobile/src/components/feed/SourceBadge.tsx` (37 linhas) — badge colorido de fonte, mas só cobre `VideoSource` (`youtube`/`tiktok`/`instagram`/`emealia`), **não cobre `'spoonacular'`/`'blog'`** que fazem parte de `RecipeSource`
- `apps/mobile/src/hooks/usePantry.ts` (53 linhas) + `apps/mobile/src/stores/pantryStore.ts` (26 linhas) — padrão de referência para um futuro `useSavedRecipes`/`useFavorites` (hook fino sobre store Zustand)
- `apps/mobile/src/hooks/useProfile.ts` + `apps/mobile/src/stores/profileStore.ts` — como ler `profile.plano` para o gate de limite
- `apps/mobile/app/(tabs)/pantry.tsx:14,26-27,71-79,104,118` — **padrão já estabelecido** de gate de limite de plano client-side (a replicar para `saved_recipes`)
- `apps/mobile/app/(tabs)/_layout.tsx` (34 linhas) — 5 tabs actuais: `index`, `search`, `pantry`, `planner`, `profile`; **sem tab de favoritos**
- `apps/mobile/app/(tabs)/profile.tsx` — ecrã placeholder ("F13 — Perfil e configurações"), candidato a ponto de navegação para favoritos
- `apps/mobile/src/components/ui/{Button,Card,Badge,Pill}.tsx` — componentes base reutilizáveis
- `apps/mobile/src/components/feed/VideoCard.tsx` — confirma que **não existe** nenhum player/embed de vídeo implementado no repo, apenas thumbnail estático com `ProgressRing` simulado
- `supabase/functions/{search-recipes,youtube-feed,autocomplete-ingredients}/index.ts` — nenhuma tem relação com `saved_recipes` ou limites de plano; todo o caminho de escrita em `saved_recipes` é client-direct

## Padrões de Implementação Existentes

**Query CRUD (estilo `packages/supabase/src/queries/*.ts`)**
```ts
// packages/supabase/src/queries/recipes.ts (já existe)
export async function getSavedRecipes(client: SupabaseClient<Database>, userId: string, colecao?: string) {
  let query = client.from('saved_recipes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (colecao) query = query.eq('colecao', colecao);
  return query;
}
export async function saveRecipe(client: SupabaseClient<Database>, recipe: Omit<SavedRecipe, 'id' | 'created_at'>) {
  return client.from('saved_recipes').insert(recipe).select().single();
}
export async function unsaveRecipe(client: SupabaseClient<Database>, id: string) {
  return client.from('saved_recipes').delete().eq('id', id);
}
```
`updateSavedRecipe` seguiria o mesmo padrão de `updatePantryItem` (`packages/supabase/src/queries/pantry.ts`):
```ts
export async function updatePantryItem(client: SupabaseClient<Database>, id: string, updates: Partial<PantryItem>) {
  return client.from('pantry_items').update(updates).eq('id', id).select().single();
}
```

**Hook fino sobre store Zustand (estilo `usePantry.ts`)** — busca dados uma vez por `userId` (fetch guard via `loadedUserId`), expõe `{ items, loading, add, update, remove, refetch }`, todas as mutações actualizam o store apenas em caso de sucesso.

**Gate de limite de plano (estilo `pantry.tsx`)**
```ts
const limit = profile?.plano === 'free' ? LIMITS.free.pantry_items : LIMITS.premium.pantry_items;
const limitReached = items.length >= limit;
// disabled={limitReached} no botão de adicionar/guardar + Card com mensagem de upgrade
```
Este gate é sempre a nível de UI, nunca dentro da função de query/hook — a função `add`/`saveRecipe` em si não valida limite.

**Badge de fonte colorido (estilo `SourceBadge.tsx`)** — `backgroundColor: colors[fonte]`, texto branco excepto para `emealia` (`primaryDark` sobre âmbar claro).

## Tabelas/Queries Supabase Relevantes

```sql
-- supabase/schema.sql:67-88
CREATE TABLE IF NOT EXISTS saved_recipes (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipe_id     text        NOT NULL,
  titulo        text        NOT NULL,
  fonte         text        NOT NULL,
  thumbnail_url text,
  source_url    text,
  macros        jsonb,
  filtros       text[]      DEFAULT '{}',
  colecao       text        DEFAULT 'favoritos',
  created_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_recipes: só o próprio" ON saved_recipes FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS saved_recipes_user_id_idx ON saved_recipes(user_id);
```

Pontos-chave:
- `colecao` é **texto livre**, sem enum/CHECK, sem FK — não existe (e nunca existiu, não há migrations) tabela `collections` separada.
- `UNIQUE(user_id, recipe_id)` — uma receita só pode estar guardada uma vez por utilizador (não pode estar simultaneamente em duas coleções sob a mesma linha).
- Sem índice em `colecao` — listar coleções distintas hoje exigiria `SELECT DISTINCT colecao FROM saved_recipes WHERE user_id = ...` no cliente.
- RLS é `FOR ALL` com `USING (auth.uid() = user_id)` — sem qualquer verificação de contagem/limite (limite é 100% client-side, replicando o padrão de `pantry_items`).
- `profiles.plano` é `text CHECK (plano IN ('free','premium_monthly','premium_annual'))`, default `'free'`.

## APIs Externas Relevantes
Nenhuma API externa nova é necessária para esta feature — não há chamadas a Spoonacular/YouTube/Open Food Facts envolvidas na gestão de favoritos em si. Relevante apenas para o botão "abrir receita original":
- Não existe nenhuma lib de embed de vídeo instalada (`react-native-webview`, `expo-av`, `react-native-youtube-iframe` — nenhuma encontrada em `package.json`).
- `expo-linking` está instalado (`apps/mobile/package.json`), o que permite `Linking.openURL()` para abrir `source_url` num browser externo. Não há `expo-web-browser` instalado (que daria um browser in-app modal em vez de sair da app).

## Code Snippets de Referência

**`RecipeCard.tsx` (componente a reutilizar/adaptar)**
```tsx
interface RecipeCardProps {
  recipe:       RecipeSearchResult;
  saved:        boolean;
  onToggleSave: () => void;
}
// thumbnail 96x96, metadata "X min · X kcal · N/M ingredientes",
// badges de filtro dietético via FILTROS_DIETETICOS, toggle heart/heart-outline
```

**Ponto de entrada actual de "guardar" (`search.tsx:65-91`, sem gate de limite)**
```ts
async function handleToggleSave(recipe: RecipeSearchResult) {
  if (!user) return;
  const savedId = savedMap.get(recipe.id);
  if (savedId) {
    await unsaveRecipe(supabase!, savedId);
    // remove do savedMap local
  } else {
    const { data } = await saveRecipe(supabase!, {
      user_id: user.id, recipe_id: recipe.id, titulo: recipe.titulo,
      fonte: 'spoonacular', thumbnail_url: recipe.thumbnail_url,
      source_url: recipe.source_url, macros: recipe.macros, filtros: recipe.filtros,
      colecao: 'favoritos',
    });
    // adiciona ao savedMap local
  }
}
```

**`SavedRecipe` (tipo completo)**
```ts
export interface SavedRecipe {
  id:            string;
  user_id:       string;
  recipe_id:     string;
  titulo:        string;
  fonte:         RecipeSource;      // VideoSource | 'spoonacular' | 'blog'
  thumbnail_url: string | null;
  source_url:    string | null;
  macros:        MacroNutrients | null;
  filtros:       FiltroDietetico[];
  colecao:       string;
  created_at:    string;
}
```

## Questões em Aberto
1. **`colecao` texto livre vs. tabela `collections`**: hoje só é possível listar coleções distintas com `SELECT DISTINCT colecao`. Criar/eliminar coleção "vazias" (sem receitas lá dentro) não tem onde persistir — se o utilizador cria uma coleção nova mas ainda não move nenhuma receita para lá, essa coleção "desaparece" assim que a app reinicia (não há registo dela em lado nenhum). Decidir em `/plan`: (a) manter `colecao` texto livre e aceitar que coleções vazias não persistem (mais simples, sem migration), ou (b) introduzir tabela `collections` (`id, user_id, nome, created_at`) com FK opcional em `saved_recipes.collection_id`, permitindo coleções vazias e nomes geridos centralmente.
2. **Falta `updateSavedRecipe`**: não existe ainda a query para actualizar `colecao` de uma receita já guardada (necessária para "mover entre coleções" via long-press). É uma adição directa a `packages/supabase/src/queries/recipes.ts` seguindo o padrão de `updatePantryItem`.
3. **Eliminar coleção com reatribuição**: sem tabela `collections`, "eliminar coleção" traduz-se em `UPDATE saved_recipes SET colecao = 'favoritos' WHERE user_id = ? AND colecao = ?` — decidir se isto é feito como update em lote no cliente (mais simples, sem alterações ao backend) ou se compensa uma função Postgres/RPC.
4. **`fonte: 'spoonacular'` hardcoded em `search.tsx`**: correcto para o caso actual (resultados vêm sempre da pesquisa Spoonacular), mas confirma que quando o feed de vídeos (F03) ou outras fontes vierem a gravar em `saved_recipes`, terão de passar a `fonte` real (`youtube`/`tiktok`/`instagram`). Fora do escopo desta feature mas relevante para o componente de badge.
5. **Gap de `SourceBadge`**: o componente actual só tem cores/labels para `VideoSource` (4 valores), não para `'spoonacular'`/`'blog'` que fazem parte de `RecipeSource`. Decidir se se estende `SourceBadge` para aceitar `RecipeSource` (com fallback de cor/label para `spoonacular`/`blog`) ou se se cria um mapeamento próprio no ecrã de favoritos.
6. **Nenhum limite de plano aplicado hoje**: `LIMITS.free.saved_recipes = 10` já existe em `@emealia/config`, mas `handleToggleSave` em `search.tsx` não o lê. Esta feature deve decidir se implementa o gate apenas no novo ecrã de favoritos, ou também corrige `search.tsx` para bloquear o "guardar" quando o limite é atingido (a spec do F06/ticket já assume que sim, dado o critério de aceitação de limite).
7. **Sem player/embed de YouTube no repo**: o botão "abrir receita original" para `fonte='youtube'` pede um embed — não há nenhuma lib de vídeo instalada nem padrão a seguir. Decidir se se instala `react-native-webview` (embed simples via `<WebView source={{ uri: youtube embed url }} />`) ou se se abre directamente a app/site do YouTube via `Linking.openURL` (mais simples, sem nova dependência) — isto teria impacto directo em "embed" vs. "link externo" prometido no ticket.
8. **`expo-web-browser` não instalado**: para abrir `source_url` de fontes não-YouTube (TikTok, Instagram, blog/Spoonacular) num browser in-app em vez de sair da app, seria preciso instalar `expo-web-browser`; hoje só `expo-linking`/`Linking.openURL` está disponível (sai da app).
9. **Onde encaixar na navegação**: não há tab de favoritos nas 5 tabs actuais (`index`, `search`, `pantry`, `planner`, `profile`). `profile.tsx` é ainda placeholder ("F13"). Duas opções visíveis na estrutura actual: (a) adicionar uma 6ª `Tabs.Screen`, ou (b) ecrã acessível a partir do `profile.tsx` (fora das tabs, como stack/modal). Nenhuma decisão de produto foi tomada no ticket sobre isto.
10. **Filtro por fonte cobre quais valores**: o ticket pede "filtrar por fonte" — decidir se cobre as 4 fontes de `RecipeSource` completo (`youtube`, `tiktok`, `instagram`, `spoonacular`/`blog`, `emealia`) ou só as que já aparecem em dados reais (hoje só `'spoonacular'` é gravado na prática).
