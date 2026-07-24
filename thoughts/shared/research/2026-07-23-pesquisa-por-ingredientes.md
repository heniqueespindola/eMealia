---
data: 2026-07-23
feature: "Pesquisa por Ingredientes (F04)"
status: completo
---

# Research: Pesquisa por Ingredientes

## Questão de Pesquisa
Como estruturar o ecrã de pesquisa por ingredientes (`app/(tabs)/search.tsx`), incluindo o hook `useRecipeSearch`, a Edge Function Supabase que integra com a Spoonacular API com cache Redis (TTL 1h), a estratégia de autocomplete de ingredientes, e a lógica de comparação entre ingredientes da receita e os itens de `pantry_items` do utilizador para o indicador de "em falta vs. disponíveis"?

## Sumário
O ecrã `search.tsx` existe apenas como stub (`<Text>F04 — Pesquisa por ingredientes</Text>`) e a Edge Function `search-recipes` já chama `recipes/findByIngredients` da Spoonacular, mas o cache Redis está por implementar (comentado como TODO, sem cliente Redis instalado no projecto). Precisas de criar: o hook `useRecipeSearch` (não existe), o componente de chip removível (não existe — só há `Pill` de toggle), a lógica de autocomplete (nenhuma implementação existe; há apenas uma lista estática `INGREDIENTES_COMUNS`), e o cálculo de ingredientes em falta vs. disponíveis (nenhum precedente no código). Toda a infraestrutura de despensa (`usePantry`, `pantryStore`, `getPantry`) e de favoritos (`saveRecipe`/`unsaveRecipe`/`getSavedRecipes`) já existe e pode ser reutilizada directamente.

## Ficheiros Relevantes da Codebase

- `apps/mobile/app/(tabs)/search.tsx` — stub actual do ecrã, apenas texto placeholder; é aqui que a feature entra
- `supabase/functions/search-recipes/index.ts` — Edge Function já existente que chama `recipes/findByIngredients` da Spoonacular com `SPOONACULAR_API_KEY` (via `Deno.env.get`); tem `cacheKey` calculada e comentários `// TODO: verificar cache Redis` / `// TODO: guardar em cache Redis` — **cache não está implementado**, é apenas o esqueleto
- `supabase/functions/youtube-feed/index.ts` — segunda Edge Function existente, mostra o padrão mínimo do projecto para functions (`serve` do `deno.land/std`, sem CORS headers, sem verificação de auth) — replicar este estilo para consistência
- `apps/mobile/src/hooks/usePantry.ts` — hook existente que busca/adiciona/remove `pantry_items` do Supabase directamente (não via `@emealia/supabase`); padrão a seguir para `useRecipeSearch`
- `apps/mobile/src/hooks/useFeed.ts` — outro exemplo de hook de dados com `useState`/`useEffect`, fallback para mock quando não há dados, e ordenação por correspondência de filtros (`countMatches`) — padrão reutilizável para pontuar/ordenar por `filtros_dieteticos`
- `apps/mobile/src/stores/pantryStore.ts` — store Zustand da despensa (`items`, `addItem`, `removeItem`, `setItems`) — fonte de dados para "usar despensa" pré-preencher os chips
- `apps/mobile/src/constants/onboarding.ts:10-13` — `INGREDIENTES_COMUNS` (12 ingredientes comuns em PT: Ovo, Massa, Arroz, Tomate, Cebola, Alho, Batata, Azeite, Frango, Queijo, Leite, Pão) — já usada no onboarding step2 como sugestões seleccionáveis; candidata a fonte local de autocomplete no MVP
- `apps/mobile/app/onboarding/step2.tsx` — mostra o padrão actual de selecção de ingredientes por `Pill` (toggle simples, sem input de texto livre nem chips removíveis) — este ecrã de pesquisa precisa de um padrão novo (input + chip), não apenas reutilizar `Pill` tal como está
- `apps/mobile/src/components/ui/Pill.tsx` — componente de pill toggle (seleccionado/não seleccionado); reutilizável directamente para a fila de filtros dietéticos do ecrã de pesquisa
- `apps/mobile/src/components/ui/Input.tsx` — componente de input de texto com label/erro, estilizado com tokens do tema; ponto de partida para o campo de escrita de ingredientes (mas não tem estado de sugestões/autocomplete)
- `apps/mobile/src/components/ui/Button.tsx` — botão reutilizável (variant primary/outline)
- `packages/supabase/src/queries/recipes.ts` — já expõe `getSavedRecipes`, `saveRecipe`, `unsaveRecipe` prontos a usar contra `saved_recipes` (via `@emealia/supabase`)
- `packages/supabase/src/queries/pantry.ts` — já expõe `getPantry`, `addPantryItem`, `deletePantryItem`, `addPantryItems` (via `@emealia/supabase`) — nota: `usePantry.ts` no mobile não usa este pacote, chama `supabase` directamente; há duas formas de aceder aos mesmos dados no código actual
- `packages/types/src/recipe.ts` — `Recipe`, `MacroNutrients`, `SavedRecipe`, `RecipeSource` já definidos
- `packages/types/src/pantry.ts` — `PantryItem` (`nome`, `quantidade`, `barcode`, `expira_em`) já definido
- `packages/types/src/user.ts` — `FiltroDietetico`, `Profile` já definidos
- `packages/config/src/index.ts` — `colors`, `PLANS`, `LIMITS`, `FILTROS_DIETETICOS` (lista canónica com `value`/`label` em PT) — `LIMITS.free` tem `pantry_items`, `saved_recipes`, `daily_feed`, mas **não tem limite de pesquisas** definido

## Padrões de Implementação Existentes

**Hook de dados com estado local (padrão a seguir para `useRecipeSearch`):**
```typescript
// apps/mobile/src/hooks/usePantry.ts
export function usePantry(userId: string) {
  const [items, setItems]   = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from('pantry_items').select('*').eq('user_id', userId)...;
      setItems(data ?? []);
      setLoading(false);
    }
    fetch();
  }, [userId]);
  // ...
}
```

**Hook com chamada a Edge Function seria diferente** — nenhum hook actual chama `supabase.functions.invoke`; o cliente de pesquisa precisará de um padrão novo, algo como:
```typescript
const { data, error } = await supabase.functions.invoke('search-recipes', {
  body: { ingredients, filtros, number: 10 },
});
```

**Pontuação/ordenação por correspondência de filtros (reutilizável para "em falta vs. disponíveis" ou ranking):**
```typescript
// apps/mobile/src/hooks/useFeed.ts:6-8
function countMatches(videoFiltros: FiltroDietetico[], perfilFiltros: FiltroDietetico[]): number {
  return videoFiltros.filter((f) => perfilFiltros.includes(f)).length;
}
```

**Edge Function actual (esqueleto a completar, não a recriar):**
```typescript
// supabase/functions/search-recipes/index.ts
const cacheKey = `spoonacular:${ingredients.sort().join(',')}:${filtros.join(',')}`;
// TODO: verificar cache Redis antes de chamar Spoonacular
// const cached = await redis.get(cacheKey);
// if (cached) return new Response(cached);
...
// TODO: guardar em cache Redis com TTL
// await redis.setex(cacheKey, CACHE_TTL_SECONDS, JSON.stringify(data));
```

**Componente de pill (reutilizável para filtros, não para chips removíveis):**
```typescript
// apps/mobile/src/components/ui/Pill.tsx
<Pressable onPress={onPress} style={{ borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primary : 'transparent', ... }}>
  <Text style={{ color: selected ? colors.primaryDark : colors.textPrimary }}>{label}</Text>
</Pressable>
```

## Tabelas/Queries Supabase Relevantes

- **`pantry_items`** (`supabase/schema.sql`): `id, user_id, nome, quantidade, barcode, expira_em, created_at`. RLS: `auth.uid() = user_id`. Índice em `user_id`. `nome` é texto livre em português (ex: "Ovo", "Tomate") — sem normalização/slug.
- **`saved_recipes`** (`supabase/schema.sql`): `id, user_id, recipe_id, titulo, fonte, thumbnail_url, source_url, macros (jsonb), filtros (text[]), colecao default 'favoritos', created_at`, com **`UNIQUE(user_id, recipe_id)`** — o botão de favoritos pode fazer upsert/insert e confiar nesta constraint para evitar duplicados; `unsaveRecipe` já existe para remover.
- **`video_cache`**: não relevante a esta feature (é do feed de vídeos, F03).
- Nenhuma migration em `supabase/migrations/` (pasta vazia) — o schema vive inteiramente em `supabase/schema.sql`, executado manualmente no dashboard.
- `LIMITS` em `@emealia/config` não inclui um tecto para pesquisas por ingredientes no plano `free` — precisa de decisão explícita se esta feature é ilimitada mesmo no plano grátis ou se um limite deve ser adicionado.

## APIs Externas Relevantes

- **Spoonacular — `GET /recipes/findByIngredients`**: já é o endpoint chamado pela Edge Function existente, com `ranking=1`, `ignorePantry=true`. Devolve `usedIngredients`, `missedIngredients`, `likedIngredients` por receita — **estes campos são exactamente a base para o indicador "em falta vs. disponível"**, sem necessidade de calcular a comparação manualmente no cliente/servidor (a Spoonacular já separa ingredientes usados vs. em falta com base na lista enviada). Nota: os nomes vêm em inglês.
- **Spoonacular — `GET /food/ingredients/autocomplete`**: endpoint dedicado a autocomplete de ingredientes, ainda **não integrado** em nenhuma Edge Function do projecto. Precisa de decisão em `/plan`: nova Edge Function (ex: `autocomplete-ingredients`) vs. reaproveitar `search-recipes` com uma acção diferente. Também consome quota Spoonacular — sujeito às mesmas regras de cache/`SPOONACULAR_API_KEY` nunca no cliente.
- **Cache Redis**: obrigatório pelos termos da Spoonacular (máx. 1h), mas **nenhum cliente Redis está instalado** no projecto (busca por `redis`/`ioredis`/`upstash` no repo só encontra o comentário TODO na própria function). `REDIS_URL` está comentada no `.env.example`, ainda não configurada. Como as Edge Functions do Supabase correm em runtime Deno (não Node), um cliente Node-style como `ioredis` (TCP puro) não é directamente compatível — a opção mais comum neste runtime é um cliente REST (ex: Upstash Redis via `fetch`), a confirmar em `/plan`.
- **YouTube Data API v3**: não relevante a esta feature.

## Code Snippets de Referência

**Edge Function irmã, mostra o estilo mínimo esperado (sem CORS, sem auth check) — replicar para qualquer nova function de autocomplete:**
```typescript
// supabase/functions/youtube-feed/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
const YOUTUBE_API_KEY  = Deno.env.get('YOUTUBE_API_KEY')!;
serve(async (req) => {
  const { query, filtro, maxResults = 10 } = await req.json();
  ...
  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
});
```

**Lista estática de ingredientes comuns em PT, já usada no onboarding (candidata a base de autocomplete local/offline):**
```typescript
// apps/mobile/src/constants/onboarding.ts
export const INGREDIENTES_COMUNS = [
  'Ovo', 'Massa', 'Arroz', 'Tomate', 'Cebola', 'Alho',
  'Batata', 'Azeite', 'Frango', 'Queijo', 'Leite', 'Pão',
];
```

**Filtros dietéticos canónicos, prontos a mapear para pills:**
```typescript
// packages/config/src/index.ts
export const FILTROS_DIETETICOS = [
  { value: 'vegan', label: 'Vegan' },
  { value: 'vegetariano', label: 'Vegetariano' },
  { value: 'sem_gluten', label: 'Sem Glúten' },
  { value: 'sem_lactose', label: 'Sem Lactose' },
  { value: 'airfryer', label: 'Airfryer' },
  { value: 'rapida', label: 'Rápida (< 30min)' },
  { value: 'fria', label: 'Sem cozedura' },
  { value: 'sobremesa', label: 'Sobremesa' },
  { value: 'pequeno_almoco', label: 'Pequeno-almoço' },
] as const;
```

## Questões em Aberto

1. **Cliente Redis para Deno/Edge Functions**: qual biblioteca usar (REST-based, ex: Upstash, vs. outra) já que não há precedente no projecto e `ioredis` (TCP, Node-only) não é directamente compatível com o runtime Deno das Edge Functions Supabase?
2. **Normalização de nomes de ingredientes**: a Spoonacular devolve `usedIngredients`/`missedIngredients` em inglês, mas `pantry_items.nome` e `INGREDIENTES_COMUNS` estão em português — como mapear/traduzir para comparar correctamente e apresentar o indicador "em falta vs. disponível" em português? (tradução estática, dicionário local, ou aceitar que a comparação ocorre nos termos devolvidos pela própria Spoonacular usando `ignorePantry=false` e passando os ingredientes da despensa directamente na chamada, delegando a comparação à API?)
3. **Fonte de autocomplete**: usar apenas a lista estática `INGREDIENTES_COMUNS` (rápido, sem custo de API, mas limitada a 12 itens) ou integrar o endpoint `food/ingredients/autocomplete` da Spoonacular (mais completo, mas custa quota e precisa de nova Edge Function + cache)? Pode ser um mix (local primeiro, API como fallback).
4. **Limite do plano Grátis**: a pesquisa por ingredientes deve ter um tecto diário/mensal como `daily_feed` tem no feed de vídeos, ou é ilimitada mesmo no plano `free`? `LIMITS` em `@emealia/config` não define nada para esta feature.
5. **Duplicação de camada de dados da despensa**: `usePantry.ts` (mobile) chama `supabase` directamente enquanto `packages/supabase/src/queries/pantry.ts` expõe as mesmas operações via `@emealia/supabase` — qual usar/seguir para o novo hook `useRecipeSearch` (chamar `supabase.functions.invoke` directamente no hook do mobile, ou criar uma query partilhada em `@emealia/supabase` para a Edge Function)?
6. **CORS nas Edge Functions**: nem `search-recipes` nem `youtube-feed` definem headers CORS — confirmar se isto é intencional (chamadas apenas via `supabase-js`/mobile, nunca directamente do browser web) antes de reutilizar o mesmo padrão para uma eventual function de autocomplete.
