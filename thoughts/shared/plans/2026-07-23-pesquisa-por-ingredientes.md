---
data: 2026-07-23
feature: "Pesquisa por Ingredientes (F04)"
research: "thoughts/shared/research/2026-07-23-pesquisa-por-ingredientes.md"
status: completo
---

# Spec: Pesquisa por Ingredientes (F04)

## Visão Geral
Substitui o placeholder de `apps/mobile/app/(tabs)/search.tsx` por um ecrã de pesquisa por ingredientes com chips removíveis, autocomplete via Spoonacular, toggle "usar despensa", filtros dietéticos multi-selecção, e resultados com indicador "X/Y disponíveis" — servidos por uma Edge Function que combina `recipes/findByIngredients` + `recipes/informationBulk` da Spoonacular, com cache Redis (Upstash REST) de 1h.

## Decisões tomadas (resolvem as questões em aberto do research)
1. **Cliente Redis:** Upstash Redis REST (`@upstash/redis` via `esm.sh`, compatível com o runtime Deno das Edge Functions) em vez de um cliente TCP para o Redis do Railway já documentado no `CLAUDE.md`. **Desvio da stack documentada** — o Railway Redis (TCP) não é directamente utilizável em Deno sem um proxy REST; fica registado aqui para eventual actualização do `CLAUDE.md` fora desta spec.
2. **Comparação PT/EN:** sem tradução manual. Os ingredientes são enviados tal como o utilizador os escreveu/seleccionou directamente para `findByIngredients` (com `ignorePantry=false`), e o indicador "em falta vs. disponível" usa directamente os campos `usedIngredients`/`missedIngredients` devolvidos pela Spoonacular. **Risco aceite:** ingredientes escritos livremente em português (não escolhidos do autocomplete) podem não corresponder bem a itens da base de dados da Spoonacular (maioritariamente em inglês); o mesmo se aplica aos nomes de `pantry_items.nome` usados por "usar despensa".
3. **Autocomplete:** endpoint dedicado `food/ingredients/autocomplete` da Spoonacular, via nova Edge Function `autocomplete-ingredients` com o mesmo padrão de cache. Sugestões vêm em inglês (mesma base de dados) — utilizador que seleccionar sugestões obtém melhor correspondência em `findByIngredients` do que texto livre em português.
4. **Limite plano Grátis:** pesquisa por ingredientes fica **ilimitada** mesmo no plano `free`. Sem alterações a `LIMITS` em `packages/config/src/index.ts`.
5. **Camada de dados:** `useRecipeSearch` e `useIngredientAutocomplete` chamam `supabase` directamente (padrão de `usePantry.ts`/`useFeed.ts`), não via `@emealia/supabase`. Para guardar/remover favoritos, o ecrã usa directamente `saveRecipe`/`unsaveRecipe`/`getSavedRecipes` de `@emealia/supabase`, já prontos — sem duplicar essa lógica.
6. **CORS:** sem headers CORS nas novas/alteradas Edge Functions, consistente com `search-recipes`/`youtube-feed` existentes (chamadas apenas via `supabase-js` do mobile, nunca do browser).
7. **Tempo de preparação e calorias:** `findByIngredients` não devolve `readyInMinutes` nem nutrição. A Edge Function `search-recipes` faz uma segunda chamada a `recipes/informationBulk?ids=...&includeNutrition=true` com os ids devolvidos, e funde os dois resultados por `id`.
8. **Macros completos para favoritos:** apesar do card só mostrar calorias, `RecipeSearchResult.macros` transporta o `MacroNutrients` completo (calorias/proteínas/hidratos/gorduras) extraído de `informationBulk`, para que `saved_recipes.macros` seja preenchido correctamente ao guardar.

## Ficheiros a Criar

### `supabase/functions/autocomplete-ingredients/index.ts`
**Propósito:** Edge Function que chama `food/ingredients/autocomplete` da Spoonacular com cache Redis.
**Conteúdo:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://esm.sh/@upstash/redis@1.31.2';

const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')!;
const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});
const CACHE_TTL_SECONDS = 3600; // 1 hora — obrigatório por ToS Spoonacular

serve(async (req) => {
  const { query } = await req.json();

  if (!query || query.length < 2) {
    return new Response(JSON.stringify({ suggestions: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const cacheKey = `spoonacular:autocomplete:${query.toLowerCase()}`;
  const cached = await redis.get<string[]>(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({ suggestions: cached }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({ query, number: '8', apiKey: SPOONACULAR_API_KEY });
  const res  = await fetch(`https://api.spoonacular.com/food/ingredients/autocomplete?${params}`);
  const data = (await res.json()) as { name: string }[];
  const suggestions = data.map((i) => i.name);

  await redis.set(cacheKey, suggestions, { ex: CACHE_TTL_SECONDS });

  return new Response(JSON.stringify({ suggestions }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### `apps/mobile/src/hooks/useRecipeSearch.ts`
**Propósito:** Encapsula estado de ingredientes/filtros seleccionados, debounce, e chamada à Edge Function `search-recipes`.
**Conteúdo:**
- Import `supabase` de `@/lib/supabase`, `useState`/`useEffect` de `react`, tipos `FiltroDietetico`, `PantryItem`, `RecipeSearchResult` de `@emealia/types`
- Estado: `ingredients: string[]`, `filtros: FiltroDietetico[]`, `results: RecipeSearchResult[]`, `loading: boolean`, `error: string | null`
- `useEffect` com debounce de 500ms, dependências `[ingredients.join(','), filtros.join(',')]`:
  - Se `ingredients.length === 0`: `setResults([]); setLoading(false); return;` (sem chamada)
  - Caso contrário: `setLoading(true)`, `setTimeout` de 500ms que chama `supabase.functions.invoke('search-recipes', { body: { ingredients, filtros, number: 10 } })`, define `results`/`error`, `setLoading(false)`; `clearTimeout` no cleanup do efeito
- `addIngredient(nome: string)`: `trim()`, ignora vazio, evita duplicados (comparação case-insensitive: `!prev.some((i) => i.toLowerCase() === trimmed.toLowerCase())`)
- `removeIngredient(nome: string)`: remove por igualdade exacta
- `toggleFiltro(f: FiltroDietetico)`: adiciona/remove de `filtros`
- `usarDespensa(pantryItems: PantryItem[])`: adiciona `pantryItems.map(p => p.nome)` a `ingredients` sem duplicar (mesma comparação case-insensitive)
- Retorna `{ ingredients, filtros, results, loading, error, addIngredient, removeIngredient, toggleFiltro, usarDespensa }`

### `apps/mobile/src/hooks/useIngredientAutocomplete.ts`
**Propósito:** Hook de sugestões de autocomplete a partir do texto do input, com debounce de 300ms.
**Conteúdo:**
```typescript
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useIngredientAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await supabase.functions.invoke('autocomplete-ingredients', {
        body: { query: query.trim() },
      });
      setSuggestions(data?.suggestions ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return suggestions;
}
```

### `apps/mobile/src/components/pantry/IngredientChip.tsx`
**Propósito:** Chip removível para um ingrediente seleccionado.
**Conteúdo:**
- Props: `{ nome: string; onRemove: () => void }`
- `View` em linha (`flexDirection: 'row'`, `alignItems: 'center'`), fundo `colors.bgDarkAlt`, borda `colors.primary`, `borderRadius: radius.full`
- `Text` com `nome` (`fonts.medium`, `colors.textInverted`)
- `Pressable` com `Ionicons name="close-circle" size={18} color={colors.textMuted}` (de `@expo/vector-icons`, já usado em `CarouselStrip.tsx`), `hitSlop={8}`, chama `onRemove`
- Sob 30 linhas

### `apps/mobile/src/components/pantry/IngredientAutocompleteList.tsx`
**Propósito:** Lista de sugestões tocáveis, renderizada por baixo do `Input` de ingredientes.
**Conteúdo:**
- Props: `{ suggestions: string[]; onSelect: (nome: string) => void }`
- `View` com fundo `colors.bgDarkAlt`, `borderRadius: radius.md`, `overflow: 'hidden'`
- `suggestions.map` → `Pressable` por sugestão (`paddingHorizontal: 14, paddingVertical: 10`, separador `borderBottomWidth: 1, borderBottomColor: colors.border`), `onPress={() => onSelect(s)}`, `Text` (`fonts.regular`, `colors.textInverted`)
- Sob 30 linhas

### `apps/mobile/src/components/recipe/FilterRow.tsx`
**Propósito:** Fila de `Pill` para multi-selecção de `FiltroDietetico`, isolada para manter `search.tsx` pequeno.
**Conteúdo:**
```typescript
import { View } from 'react-native';
import { Pill } from '@/components/ui/Pill';
import { FILTROS_DIETETICOS } from '@emealia/config';
import type { FiltroDietetico } from '@emealia/types';

interface FilterRowProps {
  filtrosSelecionados: FiltroDietetico[];
  onToggle: (f: FiltroDietetico) => void;
}

export function FilterRow({ filtrosSelecionados, onToggle }: FilterRowProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
      {FILTROS_DIETETICOS.map((f) => (
        <Pill
          key={f.value}
          label={f.label}
          selected={filtrosSelecionados.includes(f.value)}
          onPress={() => onToggle(f.value)}
        />
      ))}
    </View>
  );
}
```

### `apps/mobile/src/components/recipe/RecipeCard.tsx`
**Propósito:** Card de resultado — thumbnail, título, tempo, calorias, indicador de disponibilidade, badges de filtros, botão de favoritos.
**Conteúdo:**
- Props: `{ recipe: RecipeSearchResult; saved: boolean; onToggleSave: () => void }`
- `View` em linha: `Image` 96×96 (`resizeMode="cover"`, `recipe.thumbnail_url`) + coluna de texto (`flex: 1`) + `Pressable` de favoritos à direita
- Coluna de texto: título (`fonts.semibold`, `numberOfLines={2}`), linha de metadados (`fonts.regular`, tamanho 12, `colors.textMuted`) combinando `${tempo_minutos} min`, `${macros.calorias} kcal` (se existirem) e `${ingredientes_usados.length}/${total_ingredientes} disponíveis`
- Badges de `recipe.filtros`: `View.map` pequeno com fundo `colors.primary`, texto `colors.primaryDark`, label vindo de `FILTROS_DIETETICOS.find(opt => opt.value === f)?.label`
- Botão de favoritos: `Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={colors.primary}`, `onPress={onToggleSave}`
- Fundo do card `colors.bgDarkAlt`, `borderRadius: radius.lg`, `marginBottom: spacing.md`
- Sob 80 linhas

## Ficheiros a Modificar

### `packages/types/src/recipe.ts`
**Modificações:**
- [x] Adicionar e exportar:
  ```typescript
  export interface RecipeSearchResult {
    id:                    string;
    titulo:                string;
    thumbnail_url:         string;
    source_url:            string | null;
    tempo_minutos:         number | null;
    macros:                MacroNutrients | null;
    filtros:               FiltroDietetico[];
    ingredientes_usados:   string[];
    ingredientes_em_falta: string[];
    total_ingredientes:    number;
  }
  ```

### `supabase/functions/search-recipes/index.ts`
**Modificações:** reescrita completa do ficheiro.
**Novo conteúdo:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Redis } from 'https://esm.sh/@upstash/redis@1.31.2';

const SPOONACULAR_API_KEY = Deno.env.get('SPOONACULAR_API_KEY')!;
const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});
const CACHE_TTL_SECONDS = 3600; // 1 hora — obrigatório por ToS Spoonacular

const FILTRO_DISHTYPE_MAP: Record<string, string> = {
  dessert:   'sobremesa',
  breakfast: 'pequeno_almoco',
};

function mapFiltros(info: any): string[] {
  const filtros: string[] = [];
  if (info.vegan) filtros.push('vegan');
  else if (info.vegetarian) filtros.push('vegetariano');
  if (info.glutenFree) filtros.push('sem_gluten');
  if (info.dairyFree) filtros.push('sem_lactose');
  if (typeof info.readyInMinutes === 'number' && info.readyInMinutes <= 30) filtros.push('rapida');
  for (const dishType of info.dishTypes ?? []) {
    const mapped = FILTRO_DISHTYPE_MAP[dishType];
    if (mapped && !filtros.includes(mapped)) filtros.push(mapped);
  }
  return filtros;
}

function extractMacros(info: any) {
  const nutrients = info.nutrition?.nutrients;
  if (!nutrients) return null;
  const find = (name: string) => nutrients.find((n: any) => n.name === name)?.amount ?? 0;
  return {
    calorias:  Math.round(find('Calories')),
    proteinas: Math.round(find('Protein')),
    hidratos:  Math.round(find('Carbohydrates')),
    gorduras:  Math.round(find('Fat')),
  };
}

serve(async (req) => {
  const { ingredients, filtros = [], number = 10 } = await req.json();

  if (!ingredients?.length) {
    return new Response(JSON.stringify({ error: 'ingredients obrigatório' }), { status: 400 });
  }

  const cacheKey = `spoonacular:search:${[...ingredients].sort().join(',')}:${[...filtros].sort().join(',')}:${number}`;

  const cached = await redis.get<any[]>(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({ results: cached }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const findParams = new URLSearchParams({
    ingredients:  ingredients.join(','),
    number:       String(number),
    ranking:      '1',
    ignorePantry: 'false',
    apiKey:       SPOONACULAR_API_KEY,
  });
  const findRes  = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?${findParams}`);
  const findData = await findRes.json();

  if (!Array.isArray(findData) || findData.length === 0) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const bulkParams = new URLSearchParams({
    ids:              findData.map((r: any) => r.id).join(','),
    includeNutrition: 'true',
    apiKey:           SPOONACULAR_API_KEY,
  });
  const bulkRes  = await fetch(`https://api.spoonacular.com/recipes/informationBulk?${bulkParams}`);
  const bulkData = await bulkRes.json();
  const infoById = new Map((bulkData as any[]).map((info) => [info.id, info]));

  const results = findData.map((r: any) => {
    const info = infoById.get(r.id);
    return {
      id:                    String(r.id),
      titulo:                r.title,
      thumbnail_url:         r.image,
      source_url:            info?.sourceUrl ?? null,
      tempo_minutos:         info?.readyInMinutes ?? null,
      macros:                info ? extractMacros(info) : null,
      filtros:               info ? mapFiltros(info) : [],
      ingredientes_usados:   r.usedIngredients.map((i: any) => i.name),
      ingredientes_em_falta: r.missedIngredients.map((i: any) => i.name),
      total_ingredientes:    r.usedIngredientCount + r.missedIngredientCount,
    };
  });

  const filtered = filtros.length > 0
    ? results.filter((res: any) => filtros.every((f: string) => res.filtros.includes(f)))
    : results;

  await redis.set(cacheKey, filtered, { ex: CACHE_TTL_SECONDS });

  return new Response(JSON.stringify({ results: filtered }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### `.env.example`
**Modificações:**
- [x] Substituir a linha comentada `# REDIS_URL=redis://xxx` por:
  ```bash
  # UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
  # UPSTASH_REDIS_REST_TOKEN=xxx
  ```

### `apps/mobile/app/(tabs)/search.tsx`
**Modificações:** substituição completa do ficheiro (actualmente só placeholder de 9 linhas).
**Novo conteúdo:**
- Imports: `useState`, `useEffect` de `react`; `View`, `Text`, `FlatList`, `ActivityIndicator` de `react-native`; `SafeAreaView` de `react-native-safe-area-context`; `useAuth` de `@/hooks/useAuth`; `usePantry` de `@/hooks/usePantry`; `useRecipeSearch` de `@/hooks/useRecipeSearch`; `useIngredientAutocomplete` de `@/hooks/useIngredientAutocomplete`; `Input` de `@/components/ui/Input`; `Pill` de `@/components/ui/Pill`; `IngredientChip` de `@/components/pantry/IngredientChip`; `IngredientAutocompleteList` de `@/components/pantry/IngredientAutocompleteList`; `FilterRow` de `@/components/recipe/FilterRow`; `RecipeCard` de `@/components/recipe/RecipeCard`; `colors, fonts, spacing` de `@/constants/theme`; `saveRecipe, unsaveRecipe, getSavedRecipes` de `@emealia/supabase`; `supabase` de `@/lib/supabase`; `type { RecipeSearchResult } from '@emealia/types'`
- `const { user } = useAuth();`
- `const { items: pantryItems } = usePantry(user?.id ?? '');`
- `const { ingredients, filtros, results, loading, addIngredient, removeIngredient, toggleFiltro, usarDespensa } = useRecipeSearch();`
- `const [inputText, setInputText] = useState('');`
- `const [usandoDespensa, setUsandoDespensa] = useState(false);`
- `const suggestions = useIngredientAutocomplete(inputText);`
- `const [savedMap, setSavedMap] = useState<Map<string, string>>(new Map());` — mapa `recipe_id → saved_recipes.id`
- `useEffect` dependente de `user?.id`: se existir, chama `getSavedRecipes(supabase, user.id)` e popula `savedMap` a partir de `data.map(r => [r.recipe_id, r.id])`
- `handleSubmitIngredient()`: se `inputText.trim()`, chama `addIngredient(inputText.trim())` e limpa `inputText`
- `handleSelectSuggestion(nome: string)`: chama `addIngredient(nome)` e limpa `inputText`
- `handleToggleDespensa()`: inverte `usandoDespensa`; quando activa (`true`), chama `usarDespensa(pantryItems)` (não remove ingredientes ao desactivar — apenas deixa de sincronizar novos itens da despensa, conforme critério "sem duplicar ingredientes já adicionados manualmente")
- `handleToggleSave(recipe: RecipeSearchResult)`: assíncrono; se `savedMap` já tem `recipe.id`, chama `unsaveRecipe(supabase, savedId)` e remove a entrada do mapa; senão chama `saveRecipe(supabase, { user_id: user.id, recipe_id: recipe.id, titulo: recipe.titulo, fonte: 'spoonacular', thumbnail_url: recipe.thumbnail_url, source_url: recipe.source_url, macros: recipe.macros, filtros: recipe.filtros, colecao: 'favoritos' })` e adiciona `recipe.id → data.id` ao mapa
- Estrutura JSX:
  ```
  SafeAreaView (flex:1, backgroundColor: colors.bgDark)
    View (header: paddingHorizontal spacing.lg, paddingTop spacing.md)
      Text "Pesquisar por ingredientes" (fonts.display, fontSize 24, color colors.primary)
      Input (label "Adicionar ingrediente", value inputText, onChangeText, onSubmitEditing=handleSubmitIngredient, placeholder "ex: ovo, tomate...")
      {suggestions.length > 0 && <IngredientAutocompleteList suggestions={suggestions} onSelect={handleSelectSuggestion} />}
      View (flexDirection row, flexWrap wrap) -- chips
        ingredients.map(ing => <IngredientChip key={ing} nome={ing} onRemove={() => removeIngredient(ing)} />)
      Pill (label "Usar despensa", selected=usandoDespensa, onPress=handleToggleDespensa)
      FilterRow (filtrosSelecionados=filtros, onToggle=toggleFiltro)
    -- corpo: estado vazio / loading / sem resultados / lista
    {ingredients.length === 0
      ? View centrado com Text "Adiciona pelo menos um ingrediente para veres receitas."
      : loading
        ? ActivityIndicator (color colors.primary)
        : results.length === 0
          ? View centrado com Text "Nenhuma receita encontrada com estes ingredientes/filtros."
          : FlatList (data=results, keyExtractor=(r)=>r.id, contentContainerStyle padding spacing.lg,
              renderItem={({item}) => <RecipeCard recipe={item} saved={savedMap.has(item.id)} onToggleSave={() => handleToggleSave(item)} />})
    }
  ```

## Ficheiros a NÃO tocar (fora do escopo, confirmado no research/ticket)
- `packages/supabase/src/queries/recipes.ts` e `packages/supabase/src/queries/pantry.ts` — já expõem o que é necessário, sem alterações
- `apps/mobile/src/hooks/usePantry.ts` e `apps/mobile/src/stores/pantryStore.ts` — reutilizados tal como estão
- `supabase/schema.sql` — sem alterações de schema; `saved_recipes`/`pantry_items` já suportam esta feature
- `packages/config/src/index.ts` (`LIMITS`) — sem tecto para esta feature, conforme decisão 4
- Barcode scanner, CRUD completo da despensa, planeamento semanal, lista de compras, ecrã web — fora do escopo (ver ticket)

## Fases de Implementação

### Fase 1: Edge Functions + tipos partilhados
**Ficheiros:**
- Modificar `supabase/functions/search-recipes/index.ts`
- Criar `supabase/functions/autocomplete-ingredients/index.ts`
- Modificar `packages/types/src/recipe.ts`
- Modificar `.env.example`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` passa sem erros no workspace `packages/types` (verificado via `apps/mobile`, que consome `@emealia/types`; nenhum erro novo introduzido — os erros pré-existentes de `supabase` possivelmente `null` e `VideoSource` em falta em `recipe.ts` já existiam antes desta fase, confirmado por `git stash`)
- [ ] `deno check` — CLI Deno não está instalada localmente, não foi possível correr

**Critérios de sucesso (manuais):**
- [ ] Configurar `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN`/`SPOONACULAR_API_KEY` como secrets do projecto Supabase (`supabase secrets set ...`) e fazer deploy de ambas as functions (`supabase functions deploy search-recipes` / `autocomplete-ingredients`)
- [ ] Invocar `search-recipes` manualmente (ex: via `curl` com `Authorization: Bearer <anon key>`) com `{ "ingredients": ["egg", "tomato"] }` devolve `results` com `tempo_minutos`, `macros`, `filtros` preenchidos
- [ ] Repetir a mesma invocação dentro de 1h confirma resposta idêntica servida a partir da cache (pode confirmar via latência visivelmente menor ou logs da function sem nova chamada de rede à Spoonacular)
- [ ] Invocar `autocomplete-ingredients` com `{ "query": "egg" }` devolve `suggestions` não vazio

### Fase 2: Hooks
**Ficheiros:**
- Criar `apps/mobile/src/hooks/useRecipeSearch.ts`
- Criar `apps/mobile/src/hooks/useIngredientAutocomplete.ts`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` sem erros no workspace `apps/mobile` (mesmo padrão pré-existente `'supabase' is possibly 'null'` já presente em `usePantry.ts`/`useFeed.ts`/`useAuth.ts`; nenhuma categoria de erro nova)

**Critérios de sucesso (manuais):**
- [ ] Nenhum ainda — hooks sem UI associada nesta fase; validados na Fase 4

### Fase 3: Componentes de UI isolados
**Ficheiros:**
- Criar `apps/mobile/src/components/pantry/IngredientChip.tsx`
- Criar `apps/mobile/src/components/pantry/IngredientAutocompleteList.tsx`
- Criar `apps/mobile/src/components/recipe/FilterRow.tsx`
- Criar `apps/mobile/src/components/recipe/RecipeCard.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` sem erros (mesmo conjunto pré-existente de erros não relacionados; nenhum novo)
- [x] Cada ficheiro sob 150 linhas (`IngredientChip.tsx` 25, `IngredientAutocompleteList.tsx` 28, `FilterRow.tsx` 24, `RecipeCard.tsx` 67 — os dois de `pantry`/autocomplete também respeitam o limite "sob 30 linhas" indicado no seu próprio ficheiro-a-criar, e `RecipeCard.tsx` respeita "sob 80 linhas")

**Critérios de sucesso (manuais):**
- [ ] Nenhum ainda — componentes sem ecrã associado nesta fase; validados na Fase 4

### Fase 4: Ecrã de pesquisa e ligação de dados
**Ficheiros:**
- Modificar `apps/mobile/app/(tabs)/search.tsx`

**Critérios de sucesso (automáticos):**
- [x] `tsc --noEmit` sem erros (mesmo conjunto pré-existente; as 3 chamadas a `getSavedRecipes`/`unsaveRecipe`/`saveRecipe` usam `supabase!`, seguindo o precedente já estabelecido em `useProfile.ts:28` e `onboarding/step3.tsx:46,59` para o mesmo mismatch de tipo `SupabaseClient | null`)

**Critérios de sucesso (manuais):**
- [x] Abrir o separador "Pesquisa" mostra input + estado vazio ("Adiciona pelo menos um ingrediente...")
- [x] Escrever 2+ caracteres no input mostra sugestões; tocar numa sugestão adiciona-a como chip e limpa o input
- [x] Escrever um ingrediente e premir "done"/enter também adiciona como chip
- [x] Tocar no × de um chip remove-o e os resultados recalculam
- [x] Activar "Usar despensa" (com itens em `pantry_items`) pré-preenche chips sem duplicar os já existentes
- [x] Seleccionar/desseleccionar pills de filtro dietético recalcula os resultados (após o debounce)
- [x] Com pelo menos um ingrediente, os resultados aparecem com thumbnail, título, tempo, calorias, indicador "X/Y disponíveis" e badges de filtros
- [x] Combinação de ingredientes+filtros sem correspondência mostra o estado "Nenhuma receita encontrada..."
- [x] Tocar no ícone de coração numa receita guarda-a em `saved_recipes` (verificar na tabela ou reabrindo o ecrã que o coração fica preenchido); tocar novamente remove
- [x] Repetir a mesma pesquisa pouco depois é visivelmente mais rápida (cache Redis servida pela Edge Function)

## Estratégia de Testes
- **Unit:** não há suite de testes automatizados configurada no projecto para `apps/mobile`/`supabase/functions` além de `tsc --noEmit` — validação desta feature é manual, conforme critérios de cada fase
- **Manual:** correr `npm run mobile` (raiz do monorepo) e testar os passos da Fase 4 no iOS Simulator; para as Edge Functions, usar `supabase functions serve` localmente com um `.env` local contendo `SPOONACULAR_API_KEY`/`UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` antes de invocar via `curl`, conforme critérios da Fase 1

## Notas de Implementação
- **`SPOONACULAR_API_KEY` nunca no cliente:** ambas as Edge Functions (`search-recipes`, `autocomplete-ingredients`) são o único lugar onde a chave é usada, conforme regra do `CLAUDE.md`
- **Cache Redis obrigatório (máx. 1h):** implementado via Upstash REST nas duas functions com `CACHE_TTL_SECONDS = 3600`; a chave de `search-recipes` inclui ingredientes ordenados + filtros ordenados + `number`, conforme critério de aceitação do ticket
- **Custo de quota Spoonacular:** cada pesquisa nova (cache miss) consome 1 chamada a `findByIngredients` + 1 chamada a `informationBulk` (com `includeNutrition=true`, que tem custo adicional por receita) — o cache de 1h é o que mantém isto sustentável; não reduzir o TTL abaixo de 1h nem removê-lo
- **Debounce:** 500ms em `useRecipeSearch` (ingredientes/filtros) e 300ms em `useIngredientAutocomplete`, para não disparar um pedido de rede por cada alteração/tecla
- **Risco de correspondência PT/EN:** documentado na secção "Decisões tomadas" (#2) — não resolvido nesta spec por decisão explícita; se a qualidade dos resultados para ingredientes escritos livremente em português for insuficiente em teste manual, isso é matéria para uma spec de follow-up (dicionário de tradução ou normalização), não para reabrir esta
- **`CLAUDE.md` desactualizado:** a secção de stack lista "Redis (Railway)"; esta spec usa Upstash REST por compatibilidade com Deno. Não editado automaticamente por esta spec — sinalizar ao utilizador para actualizar manualmente se aceitar esta direcção
- **GDPR:** nenhum dado pessoal novo é introduzido; `pantry_items`/`saved_recipes` já têm RLS existente, sem alterações de schema

## Referências
- Research: `thoughts/shared/research/2026-07-23-pesquisa-por-ingredientes.md`
- Ticket original: `thoughts/shared/tickets/2026-07-23-pesquisa-por-ingredientes.md`
- Padrão de hook de dados: `apps/mobile/src/hooks/usePantry.ts`
- Padrão de hook com debounce/ordenação: `apps/mobile/src/hooks/useFeed.ts:6-8`
- Padrão de Edge Function mínima: `supabase/functions/youtube-feed/index.ts`
- Queries de favoritos prontas: `packages/supabase/src/queries/recipes.ts`
- Filtros dietéticos canónicos: `packages/config/src/index.ts:38-48`
