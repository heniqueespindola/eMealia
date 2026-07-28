---
data: 2026-07-27
feature: "Planeamento semanal (F09)"
status: completo
---

# Research: Planeamento Semanal de Refeições (F09)

## Questão de Pesquisa
Como reutilizar a lógica de consolidação de ingredientes já prevista em F07 para o botão "gerar lista de compras" da semana; como obter macros estruturados por slot quando a receita não está em `saved_recipes` (bloqueio partilhado com F07); qual a biblioteca/abordagem de drag-and-drop mais adequada com `react-native-gesture-handler` + `reanimated@3.x` nesta grelha; e como o hook de leitura de plano/entitlements de F08 deve ser consumido aqui para bloquear o acesso ao ecrã no plano `free`.

## Sumário
O ecrã `app/(tabs)/planner.tsx` já existe mas é apenas um stub (título + botão "Gerar lista da semana"): não tem grelha semanal, não tem CRUD de slots, e **não tem nenhum bloqueio Premium** apesar de `FEATURES.md` marcar F09 como "DONE". A consolidação receita→lista já está implementada e funcional (`useShoppingList().addFromSemana`), mas só cobre receitas `fonte === 'spoonacular'` — vídeos (YouTube/TikTok/Instagram) são silenciosamente ignorados. Não existe hook `usePlan`/`useEntitlements`; toda a gate Premium no resto da app é feita inline via `profile.plano` + `PLANS[...].features` do `@emealia/config`, com o componente `PremiumLock` já pronto para reutilizar. Não existe biblioteca de drag-and-drop na stack — só `Swipeable` (gesture-handler) para swipe-to-delete e um padrão de scroll animado com `reanimated` (sem drag entre alvos). Macros por slot não têm fonte estruturada própria em `meal_plan`; têm de vir de `saved_recipes.macros` (quando a receita também está nos favoritos) ou de uma nova chamada Spoonacular com `includeNutrition: true` (a função `recipe-ingredients` atual pede explicitamente `includeNutrition: 'false'`).

## Ficheiros Relevantes da Codebase

- [apps/mobile/app/(tabs)/planner.tsx](apps/mobile/app/(tabs)/planner.tsx) — ecrã actual: só título "F09 — Planeamento semanal (Premium)" + botão "Gerar lista da semana". Sem grelha, sem CRUD de slots, sem nenhum bloqueio de plano.
- [apps/mobile/src/hooks/useMealPlanWeek.ts](apps/mobile/src/hooks/useMealPlanWeek.ts) — só tem `fetchSemana(semanaInicio)` (leitura). Não tem `addSlot`/`updateSlot`/`removeSlot`/`moveSlot` — têm de ser adicionados.
- [packages/supabase/src/queries/meal_plan.ts](packages/supabase/src/queries/meal_plan.ts) — só `getMealPlanSemana`. Falta insert/update/delete por slot.
- [packages/types/src/planner.ts](packages/types/src/planner.ts) — `MealPlanItem` (id, user_id, semana_inicio, dia_semana, momento, recipe_id, titulo, fonte, created_at). **Sem campo de macros.**
- [supabase/schema.sql:92-109](supabase/schema.sql) — tabela `meal_plan` com RLS "só o próprio" (padrão igual às outras tabelas). **Sem UNIQUE constraint** em `(user_id, semana_inicio, dia_semana, momento)` — um slot pode ter múltiplos registos se a lógica de insert não verificar existência prévia.
- [apps/mobile/src/hooks/useShoppingList.ts:71-81](apps/mobile/src/hooks/useShoppingList.ts) — `addFromSemana(mealPlanItems, pantryItems)` já implementa a consolidação pedida: filtra `fonte === 'spoonacular'`, chama a Edge Function `recipe-ingredients` por cada `recipe_id`, consolida com `consolidarIngredientes`, e insere só os que faltam via `inserirFaltantes` (que já compara com `pantry_items` e com a lista actual). **Já é chamado a partir de `planner.tsx` (`handleGerarListaSemana`)** — a funcionalidade "gerar lista da semana" já funciona para receitas Spoonacular.
- [apps/mobile/src/constants/shopping.ts](apps/mobile/src/constants/shopping.ts) — `normalizarNome` (lowercase, remove acentos, remove plural simples) e `consolidarIngredientes` (dedupe por nome normalizado) — reutilizáveis tal como estão.
- [supabase/functions/recipe-ingredients/index.ts](supabase/functions/recipe-ingredients/index.ts) — chama `GET /recipes/{id}/information?includeNutrition=false`, cache Redis 1h, só devolve `ingredientes` (nome+quantidade). **Não devolve macros.**
- [supabase/functions/search-recipes/index.ts:1-80](supabase/functions/search-recipes/index.ts) — usa `includeNutrition=true` + `informationBulk` e tem `extractMacros(info)` que já mapeia calorias/proteínas/hidratos/gorduras. É o único sítio da codebase que já sabe extrair macros da Spoonacular — padrão a replicar/reaproveitar.
- [apps/mobile/src/components/paywall/PremiumLock.tsx](apps/mobile/src/components/paywall/PremiumLock.tsx) — componente pronto: ícone de cadeado + mensagem + botão "Fazer upgrade" que navega para `/(tabs)/profile` com `params: { abrirUpgrade: '1' }`. Já reutilizado em `pantry.tsx` e `search.tsx` (como card inline, não bloqueio de ecrã inteiro) e em `ShoppingListModal.tsx` (bloqueio de acção de export).
- [packages/config/src/index.ts:19-50](packages/config/src/index.ts) — `PLANS[profile.plano].features.planeamento_semanal` já existe como booleano (`false` em `free`, `true` nos dois planos Premium). É a flag correcta para gate deste ecrã.
- [apps/mobile/src/hooks/useProfile.ts](apps/mobile/src/hooks/useProfile.ts) — devolve `{ profile, loading }`; `profile.plano` é a única fonte de verdade do plano, lida directamente de `profiles` (sem hook intermédio de entitlements).
- [apps/mobile/src/components/pantry/PantryItemCard.tsx](apps/mobile/src/components/pantry/PantryItemCard.tsx) — padrão de swipe-to-delete com `Swipeable` de `react-native-gesture-handler` (não `reanimated`) — é o padrão a seguir para "remover receita de um slot com swipe".
- [apps/mobile/src/components/feed/CarouselStrip.tsx](apps/mobile/src/components/feed/CarouselStrip.tsx) — único uso de `reanimated` "avançado" na app (`useSharedValue`, `useAnimatedScrollHandler`, `useAnimatedStyle`, `interpolate`). É scroll-driven, não drag-and-drop entre alvos — não há padrão de DnD reutilizável na codebase.
- [apps/mobile/src/hooks/useRecipeSearch.ts](apps/mobile/src/hooks/useRecipeSearch.ts) e [apps/mobile/app/(tabs)/search.tsx](apps/mobile/app/(tabs)/search.tsx) — fluxo de pesquisa por ingredientes já existente, reutilizável para "adicionar receita a um slot via pesquisa".
- [apps/mobile/src/hooks/useSavedRecipes.ts](apps/mobile/src/hooks/useSavedRecipes.ts) e [apps/mobile/app/(tabs)/favoritos.tsx](apps/mobile/app/(tabs)/favoritos.tsx) — lista de favoritos já existente, reutilizável para "adicionar receita a um slot a partir dos favoritos".
- [apps/mobile/src/components/recipe/RecipeDetailModal.tsx:63-70](apps/mobile/src/components/recipe/RecipeDetailModal.tsx) — único sítio que já renderiza macros (lista label/valor simples). Não existe componente tipo "barra de macros" (`MacroBar`) na codebase — teria de ser criado de raiz.
- [package.json (apps/mobile)](apps/mobile/package.json) — `react-native-gesture-handler: ~2.24.0`, `react-native-reanimated: ~3.17.4` (fixado em 3.x, conforme regra do CLAUDE.md). Nenhuma lib de drag-and-drop de grelha (`react-native-draggable-flatlist`, `dnd-kit`, etc.) está instalada.

## Padrões de Implementação Existentes

**Gate de plano Premium (inline, sem hook dedicado):**
```tsx
// apps/mobile/app/(tabs)/search.tsx
const limit = profile?.plano === 'free' ? LIMITS.free.saved_recipes : LIMITS.premium.saved_recipes;
...
<PremiumLock mensagem={`Atingiste o limite de ${limit} receitas guardadas do plano Grátis. Faz upgrade para Premium para guardares mais.`} />
```
```tsx
// apps/mobile/src/components/shopping/ShoppingListModal.tsx
function handleExport() {
  if (profile?.plano === 'free') { setUpgradeVisible(true); return; }
  exportItems(items.filter((i) => !i.comprado));
}
```
Para bloquear o ecrã inteiro (caso do planner, diferente dos exemplos acima que bloqueiam uma acção/limite), o padrão a seguir seria: usar `PLANS[profile.plano].features.planeamento_semanal` em vez de `profile.plano === 'free'` directo (mais correcto, já que a flag existe e cobre ambos os planos pagos), e renderizar `<PremiumLock />` no lugar da grelha quando `false`.

**Swipe-to-delete (`react-native-gesture-handler`):**
```tsx
// apps/mobile/src/components/pantry/PantryItemCard.tsx
<Swipeable renderRightActions={() => (
  <Pressable onPress={confirmDelete} style={{ backgroundColor: colors.primaryDark, ... }}>
    <Ionicons name="trash-outline" size={22} color={colors.textInverted} />
  </Pressable>
)}>
  <Pressable onPress={onEdit} onLongPress={confirmDelete}>
    <Card>...</Card>
  </Pressable>
</Swipeable>
```

**Consolidação de ingredientes já pronta para "gerar lista da semana":**
```tsx
// apps/mobile/src/hooks/useShoppingList.ts
async function addFromSemana(mealPlanItems: MealPlanItem[], pantryItems: PantryItem[]) {
  const spoonacularItems = mealPlanItems.filter((m) => m.fonte === 'spoonacular' && m.recipe_id);
  const listas = await Promise.all(
    spoonacularItems.map(async (m) => {
      const { data } = await supabase!.functions.invoke('recipe-ingredients', { body: { recipeId: m.recipe_id } });
      return (data?.ingredientes ?? []) as Ingrediente[];
    })
  );
  const consolidados = consolidarIngredientes(listas.flat());
  return inserirFaltantes(consolidados, null, pantryItems);
}
```
Já é chamado directamente do `planner.tsx` actual — não precisa de nova lógica de consolidação, só de UI.

**Extracção de macros já existente (só no lado do search, não reutilizada ainda):**
```ts
// supabase/functions/search-recipes/index.ts
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
```

**Store + hook pattern (Zustand) usado em todas as outras features, a replicar para o planner:**
Cada feature (`pantry`, `saved_recipes`, `shopping_list`) segue: `stores/xStore.ts` (estado + `loadedUserId` para evitar refetch) → `hooks/useX.ts` (efeitos + chamadas a `@emealia/supabase` + actualização optimista da store) → `packages/supabase/src/queries/x.ts` (funções puras `client.from(...)`). `useMealPlanWeek` ainda não segue este padrão (não tem store, só `fetchSemana` local) — a expandir com o mesmo padrão ao adicionar CRUD de slots.

## Tabelas/Queries Supabase Relevantes

**`meal_plan`** (`supabase/schema.sql:92-109`):
```sql
CREATE TABLE IF NOT EXISTS meal_plan (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  semana_inicio date        NOT NULL,
  dia_semana    int         NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  momento       text        NOT NULL CHECK (momento IN ('pequeno_almoco','almoco','jantar','lanche')),
  recipe_id     text,
  titulo        text,
  fonte         text,
  created_at    timestamptz DEFAULT now()
);
-- RLS: "meal_plan: só o próprio" ON meal_plan FOR ALL USING (auth.uid() = user_id)
```
Sem `UNIQUE(user_id, semana_inicio, dia_semana, momento)` — trocar a receita de um slot ou mover via drag-and-drop tem de fazer `SELECT` do slot existente e `UPDATE`/`DELETE`+`INSERT`, não pode confiar num `upsert` por falta de constraint única.

Query existente: `getMealPlanSemana(client, userId, semanaInicio)` — `select('*').eq('user_id', userId).eq('semana_inicio', semanaInicio).order('dia_semana')`. Faltam: `upsertMealPlanSlot`, `deleteMealPlanSlot` (equivalentes aos já existentes em `shopping_list.ts`: `addShoppingListItem`, `updateShoppingListItem`, `deleteShoppingListItem`).

**`saved_recipes`** — única fonte local de macros estruturados (`macros jsonb`, nullable), indexada por `(user_id, recipe_id)` único. Útil para preencher macros de um slot quando a receita também está guardada nos favoritos.

**`shopping_list`** e **`pantry_items`** — inalterados, já cobertos por F05/F07; reutilizados via `useShoppingList`/`usePantry` tal como já feito em `planner.tsx`.

## APIs Externas Relevantes

**Spoonacular — `GET /recipes/{id}/information`**
- `recipe-ingredients` (actual): `includeNutrition=false`, cache Redis 1h, devolve só `extendedIngredients` mapeado para `{ nome, quantidade }`.
- `search-recipes` (actual): `includeNutrition=true` via `informationBulk`, já extrai macros com `extractMacros`.
- Para macros por slot de receita Spoonacular avulsa (não vinda de uma pesquisa recente, ex. reaberta de um plano de semanas passadas), será necessária uma nova chamada com `includeNutrition=true` — ou estender `recipe-ingredients` para devolver também `macros` (reaproveitando `extractMacros`), evitando duplicar Edge Functions. Cache Redis 1h continua obrigatório (ToS Spoonacular, regra do CLAUDE.md).

## Code Snippets de Referência

Cálculo de "segunda-feira da semana actual" já implementado em `planner.tsx` (a reaproveitar para navegação entre semanas):
```tsx
function segundaFeiraDaSemana(): string {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=Domingo, 1=Segunda, ...
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() + diff);
  return segunda.toISOString().slice(0, 10);
}
```

## Questões em Aberto

1. **Drag-and-drop entre slots:** não existe nenhuma lib de DnD de grelha na stack (`package.json` só tem `gesture-handler` + `reanimated@3.x`, usados até agora só para scroll/swipe). É preciso decidir em `/plan`: (a) construir DnD à mão com `PanGestureHandler`/`Gesture.Pan()` + `reanimated` shared values sobre a grelha 7×4, ou (b) simplificar a interacção para "tocar para seleccionar receita + tocar no slot destino" (sem verdadeiro arrastar), o que evita risco técnico mas diverge do pedido original ("drag-and-drop"). Recomenda-se decidir isto explicitamente na fase de plan, dado o esforço muito maior da opção (a).
2. **Macros por slot sem receita guardada:** para receitas Spoonacular não presentes em `saved_recipes`, falta decidir se se estende `recipe-ingredients` para devolver também macros (reaproveitando `extractMacros` de `search-recipes`) ou se se cria uma nova Edge Function dedicada. Para receitas de vídeo (YouTube/TikTok/Instagram) **não há macros estruturados em lado nenhum** — mesma lacuna já assinalada na ticket de F07; a barra de macros diária terá de decidir como tratar dias com receitas sem macros (omitir do total, mostrar aviso de "dados parciais", etc.).
3. **Falta de UNIQUE constraint em `meal_plan`:** decidir se se adiciona `UNIQUE(user_id, semana_inicio, dia_semana, momento)` via migration (permitindo `upsert`) ou se a lógica de app faz sempre `select`-antes-de-`insert/update` para evitar slots duplicados.
4. **`addFromSemana` só cobre `fonte === 'spoonacular'`:** confirmar se isto é aceitável para o MVP desta feature (mesma limitação documentada na ticket de F07) ou se o planner precisa de avisar visualmente quando a lista gerada ignorou receitas de vídeo sem ingredientes estruturados.
5. **`FEATURES.md` marca F09 como "DONE"** apesar do ecrã actual ser só um stub sem grelha, sem gate Premium e sem CRUD de slots — a confirmar com o utilizador se esse estado no `FEATURES.md` está desactualizado (fica por corrigir nesta ticket, ou é um erro a reportar separadamente).
