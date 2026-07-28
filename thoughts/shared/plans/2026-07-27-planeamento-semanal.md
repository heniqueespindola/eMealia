---
data: 2026-07-27
feature: "Planeamento semanal de refeições (F09)"
research: "thoughts/shared/research/2026-07-27-planeamento-semanal.md"
status: aguarda_implementacao
---

# Spec: Planeamento Semanal de Refeições (F09)

## Visão Geral
Substituir o stub actual de `app/(tabs)/planner.tsx` por um ecrã completo com bloqueio Premium, navegação entre semanas, grelha de 7 dias × 4 momentos com CRUD de slots (adicionar via pesquisa/favoritos, mover por "tocar para seleccionar + tocar no destino", remover/trocar por swipe), barra de macros diários, e geração de lista de compras da semana reaproveitando a lógica já existente de F07.

## Decisões tomadas (resolvem as questões em aberto do research)

1. **"Drag-and-drop"** → implementado como **tap-to-move**: tocar num slot ocupado selecciona-o (destaque visual), tocar noutro slot (vazio ou ocupado) move a receita para lá. Sem `PanGestureHandler`/`reanimated` novo.
2. **Macros de slots sem `saved_recipes`** → estender a Edge Function `recipe-ingredients` para devolver também `macros`, reaproveitando `extractMacros()` — extraída para um módulo partilhado `supabase/functions/_shared/macros.ts` usado tanto por `recipe-ingredients` como por `search-recipes`.
3. **Slots duplicados em `meal_plan`** → adicionar `UNIQUE(user_id, semana_inicio, dia_semana, momento)` a `supabase/schema.sql` e usar `upsert` com `onConflict` nas queries.
4. **Receitas de vídeo ignoradas em "gerar lista da semana"** → mantém-se a limitação (mesma de F07), mas o ecrã mostra um aviso inline quando a lista gerada ignorou receitas de vídeo sem ingredientes estruturados.

## ⚠️ Nota de arquitectura importante — grelha não é literalmente 7 colunas lado-a-lado

O research falou em "grelha 7×4" e o ticket pede **swipe** para remover/trocar receitas. Se os 7 dias fossem colunas dentro de um `ScrollView horizontal` (como sugeria o research), o gesto de swipe horizontal dos cards **entraria em conflito** com o scroll horizontal do próprio contentor — o mesmo problema conhecido de `FlatList`/`ScrollView` horizontais aninhadas com gestos horizontais internos. Não há precedente disto na codebase: o único uso de `Swipeable` (`PantryItemCard`) está dentro de uma lista **vertical**, onde swipe (eixo X) e scroll (eixo Y) não colidem.

**Decisão de implementação:** a grelha é uma **lista vertical de dias** (`FlatList` vertical, um `PlannerDayRow` por dia), e dentro de cada dia os 4 momentos ficam lado a lado numa `View` com `flexDirection: 'row'` (sem `ScrollView` — apenas 4 células fixas, sem scroll próprio). Isto elimina o conflito de gestos e reaproveita o padrão comprovado do `PantryItemCard`. Cada célula de momento fica estreita (~80-95px em ecrãs normais) — aceitável para título truncado a 2 linhas, mas é um trade-off visual a validar no simulador.

## Ficheiros a Criar

### `supabase/functions/_shared/macros.ts`
**Propósito:** extrai `extractMacros(info)` de `search-recipes/index.ts` para um módulo partilhado, evitando duplicar a lógica quando `recipe-ingredients` também passar a devolver macros.
**Conteúdo:**
```ts
export function extractMacros(info: any) {
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

### `apps/mobile/src/constants/planner.ts`
**Propósito:** utilitários puros de datas/labels do planeamento, seguindo o padrão de `constants/shopping.ts` e `constants/pantry.ts`.
**Conteúdo:**
```ts
import type { Momento } from '@emealia/types';

export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const MOMENTOS: { value: Momento; label: string }[] = [
  { value: 'pequeno_almoco', label: 'Pequeno-almoço' },
  { value: 'almoco',         label: 'Almoço' },
  { value: 'jantar',         label: 'Jantar' },
  { value: 'lanche',         label: 'Lanche' },
];

export function segundaFeiraDaSemana(base: Date = new Date()): string {
  const diaSemana = base.getDay();
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(base);
  segunda.setDate(base.getDate() + diff);
  return segunda.toISOString().slice(0, 10);
}

export function adicionarSemanas(semanaInicio: string, deltaSemanas: number): string {
  const data = new Date(`${semanaInicio}T00:00:00`);
  data.setDate(data.getDate() + deltaSemanas * 7);
  return data.toISOString().slice(0, 10);
}

export function formatarIntervaloSemana(semanaInicio: string): string {
  const inicio = new Date(`${semanaInicio}T00:00:00`);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(inicio)} – ${fmt(fim)}`;
}
```
Nota: `segundaFeiraDaSemana` é a mesma função já escrita inline em `planner.tsx` (research, linhas 138-148) — mover para aqui e apagar a versão inline.

### `apps/mobile/src/stores/plannerStore.ts`
**Propósito:** store Zustand do plano semanal, seguindo o padrão de `shoppingListStore.ts`/`savedRecipesStore.ts` (`loadedKey` evita refetch ao trocar de ecrã e voltar).
**Conteúdo:**
```ts
import { create } from 'zustand';
import type { MealPlanItem } from '@emealia/types';

interface PlannerState {
  items:      MealPlanItem[];
  loading:    boolean;
  loadedKey:  string | null; // `${userId}:${semanaInicio}`
  setItems:   (key: string, items: MealPlanItem[]) => void;
  setLoading: (loading: boolean) => void;
  upsertItem: (item: MealPlanItem) => void;
  removeItem: (id: string) => void;
  reset:      () => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  items:      [],
  loading:    true,
  loadedKey:  null,
  setItems:   (loadedKey, items) => set({ items, loadedKey, loading: false }),
  setLoading: (loading) => set({ loading }),
  upsertItem: (item) =>
    set((s) => ({
      items: [...s.items.filter((i) => !(i.dia_semana === item.dia_semana && i.momento === item.momento)), item],
    })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  reset:      () => set({ items: [], loadedKey: null, loading: false }),
}));
```
Nota: `upsertItem` remove qualquer item existente na mesma posição (dia+momento) antes de inserir — cobre tanto "novo slot" como "substituição via troca/mover", já que a UNIQUE constraint garante que só pode existir uma linha por posição.

### `apps/mobile/src/hooks/usePlanner.ts`
**Propósito:** hook de CRUD de `meal_plan` pedido nos critérios de aceitação da ticket. Substitui `useMealPlanWeek.ts` (ver secção "Ficheiros a Eliminar").
**Conteúdo:**
```ts
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getMealPlanSemana, upsertMealPlanSlot, deleteMealPlanSlot } from '@emealia/supabase';
import { usePlannerStore } from '@/stores/plannerStore';
import type { MealPlanItem, Momento, RecipeSource } from '@emealia/types';

interface ReceitaParaSlot {
  recipe_id: string;
  titulo:    string;
  fonte:     RecipeSource;
}

export function usePlanner(userId: string | undefined, semanaInicio: string, enabled: boolean) {
  const items   = usePlannerStore((s) => s.items);
  const loading = usePlannerStore((s) => s.loading);

  useEffect(() => {
    if (!userId || !enabled) return;
    const key = `${userId}:${semanaInicio}`;
    if (usePlannerStore.getState().loadedKey === key) return;
    fetchSemana(key, userId, semanaInicio);
  }, [userId, semanaInicio, enabled]);

  async function fetchSemana(key: string, uid: string, semana: string) {
    usePlannerStore.getState().setLoading(true);
    const { data, error } = await getMealPlanSemana(supabase!, uid, semana);
    if (error) console.error('[usePlanner] getMealPlanSemana falhou:', error);
    usePlannerStore.getState().setItems(key, data ?? []);
  }

  async function assignSlot(diaSemana: number, momento: Momento, receita: ReceitaParaSlot) {
    if (!userId) return;
    const { data, error } = await upsertMealPlanSlot(supabase!, {
      user_id: userId, semana_inicio: semanaInicio, dia_semana: diaSemana, momento,
      recipe_id: receita.recipe_id, titulo: receita.titulo, fonte: receita.fonte,
    });
    if (error) { console.error('[usePlanner] upsertMealPlanSlot falhou:', error); return; }
    if (data) usePlannerStore.getState().upsertItem(data);
  }

  async function moveSlot(item: MealPlanItem, novoDia: number, novoMomento: Momento) {
    if (!item.recipe_id || !item.titulo || !item.fonte) return;
    const { error } = await deleteMealPlanSlot(supabase!, item.id);
    if (error) { console.error('[usePlanner] deleteMealPlanSlot falhou:', error); return; }
    usePlannerStore.getState().removeItem(item.id);
    await assignSlot(novoDia, novoMomento, { recipe_id: item.recipe_id, titulo: item.titulo, fonte: item.fonte });
  }

  async function removeSlot(id: string) {
    const { error } = await deleteMealPlanSlot(supabase!, id);
    if (error) { console.error('[usePlanner] deleteMealPlanSlot falhou:', error); return; }
    usePlannerStore.getState().removeItem(id);
  }

  return { items, loading, assignSlot, moveSlot, removeSlot };
}
```
Nota crítica: `moveSlot` faz `delete` da linha de origem e depois `assignSlot` (upsert) no destino — se o destino já estiver ocupado, o `upsert` actualiza a linha existente em vez de criar uma nova (graças à UNIQUE constraint), cumprindo "sem duplicar a entrada".

### `apps/mobile/src/hooks/useRecipeMacros.ts`
**Propósito:** buscar macros de uma receita Spoonacular avulsa via `recipe-ingredients` (agora estendida).
**Conteúdo:**
```ts
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MacroNutrients } from '@emealia/types';

export function useRecipeMacros() {
  const [loading, setLoading] = useState(false);

  async function fetchMacros(recipeId: string): Promise<MacroNutrients | null> {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('recipe-ingredients', { body: { recipeId } });
    setLoading(false);
    if (error) { console.error('[useRecipeMacros] recipe-ingredients falhou:', error); return null; }
    return data?.macros ?? null;
  }

  return { fetchMacros, loading };
}
```

### `apps/mobile/src/hooks/usePlannerMacros.ts`
**Propósito:** agrega macros por dia a partir dos slots da semana. Ordem de resolução por receita: `saved_recipes.macros` (se a receita estiver nos favoritos) → `recipe-ingredients` (se `fonte === 'spoonacular'`) → indisponível (vídeo sem macros, marca o dia como "parcial").
**Conteúdo:**
```ts
import { useEffect, useRef, useState } from 'react';
import { useRecipeMacros } from './useRecipeMacros';
import type { MealPlanItem, SavedRecipe, MacroNutrients } from '@emealia/types';

interface DiaMacros {
  totais:  MacroNutrients;
  parcial: boolean;
}

const VAZIO: MacroNutrients = { calorias: 0, proteinas: 0, hidratos: 0, gorduras: 0 };

export function usePlannerMacros(items: MealPlanItem[], savedRecipes: SavedRecipe[]) {
  const { fetchMacros } = useRecipeMacros();
  const [macrosByDia, setMacrosByDia] = useState<Record<number, DiaMacros>>({});
  const cacheRef = useRef<Map<string, MacroNutrients | null>>(new Map());

  useEffect(() => {
    let cancelado = false;

    async function calcular() {
      const savedMap = new Map(savedRecipes.map((r) => [r.recipe_id, r.macros]));
      const porDia: Record<number, DiaMacros> = {};

      for (const item of items) {
        if (!item.recipe_id) continue;
        let macros: MacroNutrients | null = savedMap.get(item.recipe_id) ?? null;

        if (!macros && item.fonte === 'spoonacular') {
          if (cacheRef.current.has(item.recipe_id)) {
            macros = cacheRef.current.get(item.recipe_id)!;
          } else {
            macros = await fetchMacros(item.recipe_id);
            cacheRef.current.set(item.recipe_id, macros);
          }
        }

        const atual = porDia[item.dia_semana] ?? { totais: { ...VAZIO }, parcial: false };
        if (macros) {
          atual.totais = {
            calorias:  atual.totais.calorias  + macros.calorias,
            proteinas: atual.totais.proteinas + macros.proteinas,
            hidratos:  atual.totais.hidratos  + macros.hidratos,
            gorduras:  atual.totais.gorduras  + macros.gorduras,
          };
        } else {
          atual.parcial = true;
        }
        porDia[item.dia_semana] = atual;
      }

      if (!cancelado) setMacrosByDia(porDia);
    }

    calcular();
    return () => { cancelado = true; };
  }, [items, savedRecipes]);

  return { macrosByDia };
}
```

### `apps/mobile/src/components/planner/WeekNavigator.tsx`
**Conteúdo:** setas prev/next (ícones `chevron-back`/`chevron-forward` de `@expo/vector-icons`) + label `Semana de {formatarIntervaloSemana(semanaInicio)}`, estilo consistente com `colors`/`fonts`/`spacing` de `@/constants/theme`.

### `apps/mobile/src/components/planner/DayMacroBar.tsx`
**Props:** `{ totais: MacroNutrients; parcial: boolean }`
**Conteúdo:** `Text` compacto `"{calorias} kcal"` + `Badge` (`variant="alerta"`, label `"parcial"`) quando `parcial === true`. Layout horizontal (`flexDirection: 'row'`), pensado para caber ao lado do nome do dia num `PlannerDayRow`.

### `apps/mobile/src/components/planner/PlannerSlotCard.tsx`
**Props:** `{ item: MealPlanItem; selecionado: boolean; onPress: () => void; onRemove: () => void; onTrocar: () => void }`
**Conteúdo:** `Swipeable` (de `react-native-gesture-handler`, padrão de `PantryItemCard.tsx`) com `renderRightActions` mostrando dois botões — "trocar" (ícone `swap-horizontal`, fundo `colors.bgDarkAlt`) e "remover" (ícone `trash-outline`, fundo `colors.primaryDark`, com `Alert.alert` de confirmação antes de chamar `onRemove`). O card em si é um `Pressable` com `Card` (`onPress` chama a prop, usado para entrar/sair do modo "mover"). Quando `selecionado === true`, `Card` recebe `borderWidth: 2, borderColor: colors.primary`.

### `apps/mobile/src/components/planner/PlannerSlotEmpty.tsx`
**Props:** `{ destacado: boolean; onPress: () => void }`
**Conteúdo:** `Pressable` com borda tracejada (`borderStyle: 'dashed'`), texto `"+ Adicionar"` normalmente ou `"Mover para aqui"` quando `destacado === true` (ou seja, há um item em modo "mover" à espera de destino). Cor da borda `colors.primary` quando destacado, `colors.border` caso contrário.

### `apps/mobile/src/components/planner/PlannerDayRow.tsx`
**Props:** `{ diaSemana: number; items: MealPlanItem[]; macros: { totais: MacroNutrients; parcial: boolean } | undefined; itemEmMovimento: MealPlanItem | null; onSlotPress: (momento: Momento, itemExistente: MealPlanItem | null) => void; onRemove: (item: MealPlanItem) => void; onTrocar: (item: MealPlanItem) => void }`
**Conteúdo:** cabeçalho com nome do dia (`DIAS_SEMANA[diaSemana]`) + `DayMacroBar` à direita; por baixo, `View` com `flexDirection: 'row'` e um item por `MOMENTOS` (4 no total, cada um `flex: 1`), renderizando `PlannerSlotCard` (se existir item nesse `momento`) ou `PlannerSlotEmpty` (caso contrário).

### `apps/mobile/src/components/planner/PlannerGrid.tsx`
**Props:** `{ items: MealPlanItem[]; macrosByDia: Record<number, {...}>; itemEmMovimento: MealPlanItem | null; onSlotPress: (dia: number, momento: Momento, itemExistente: MealPlanItem | null) => void; onRemove: (item: MealPlanItem) => void; onTrocar: (item: MealPlanItem) => void }`
**Conteúdo:** `FlatList` **vertical** com `data={[0,1,2,3,4,5,6]}`, renderizando um `PlannerDayRow` por dia (ver nota de arquitectura acima — **não** usar `ScrollView horizontal`).

### `apps/mobile/src/components/planner/PlannerFavoritosTab.tsx`
**Props:** `{ favoritos: SavedRecipe[]; onSelect: (receita: { recipe_id: string; titulo: string; fonte: RecipeSource }) => void }`
**Conteúdo:** `FlatList` simples sobre `favoritos`, cada linha um `Pressable` com o título, chamando `onSelect({ recipe_id: item.recipe_id, titulo: item.titulo, fonte: item.fonte })`. `ListEmptyComponent` com mensagem "Ainda não tens receitas guardadas nos favoritos."

### `apps/mobile/src/components/planner/PlannerSearchTab.tsx`
**Props:** `{ pantryItems: PantryItem[]; onSelect: (receita: { recipe_id: string; titulo: string; fonte: RecipeSource }) => void }`
**Conteúdo:** reaproveita `useRecipeSearch()` (mesmo hook de `search.tsx`) — `Input` de ingrediente + chips + `Pill` "Usar despensa" (chama `usarDespensa(pantryItems)`) + `FlatList` de `results`, cada linha um `Pressable` chamando `onSelect({ recipe_id: item.id, titulo: item.titulo, fonte: 'spoonacular' })`.

### `apps/mobile/src/components/planner/PlannerRecipePickerModal.tsx`
**Props:** `{ visible: boolean; favoritos: SavedRecipe[]; pantryItems: PantryItem[]; onSelect: (receita: {...}) => void; onClose: () => void }`
**Conteúdo:** `Modal` (`animationType="slide"`, padrão de `RecipeDetailModal.tsx`) com título "Escolher receita" + botão fechar, duas `Pill` para alternar entre tab `'favoritos'` (default) e `'pesquisa'`, renderizando `PlannerFavoritosTab` ou `PlannerSearchTab` consoante o estado local `tab`.

## Ficheiros a Modificar

### `supabase/schema.sql`
- [ ] Depois da definição da tabela `meal_plan` (linha ~103, a seguir ao `CREATE TABLE IF NOT EXISTS meal_plan (...)`), adicionar:
```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'meal_plan_slot_unique'
  ) THEN
    ALTER TABLE meal_plan
      ADD CONSTRAINT meal_plan_slot_unique UNIQUE (user_id, semana_inicio, dia_semana, momento);
  END IF;
END $$;
```
- [ ] Confirmar que a policy RLS existente `"meal_plan: só o próprio"` continua válida (não precisa de alteração).

### `supabase/functions/search-recipes/index.ts`
- [ ] Remover a função local `extractMacros` (linhas 30-40).
- [ ] Adicionar `import { extractMacros } from '../_shared/macros.ts';` no topo.
- [ ] Resto do ficheiro inalterado.

### `supabase/functions/recipe-ingredients/index.ts`
- [ ] Adicionar `import { extractMacros } from '../_shared/macros.ts';` no topo.
- [ ] Mudar `cacheKey` de `` `spoonacular:ingredients:${recipeId}` `` para `` `spoonacular:ingredients:v2:${recipeId}` `` (o formato da resposta muda — evita devolver entradas em cache antigas sem `macros` durante a 1h de TTL restante).
- [ ] Mudar `includeNutrition: 'false'` para `includeNutrition: 'true'` nos `params` do `fetch` à Spoonacular (linha 29).
- [ ] Depois de construir `ingredientes` (linha 42-45), calcular `const macros = extractMacros(data);`.
- [ ] Guardar em cache `{ ingredientes, macros }` em vez de só `ingredientes` (linha 47).
- [ ] Devolver `JSON.stringify({ ingredientes, macros })` tanto no caminho de cache-hit (linha 24) como no de cache-miss (linha 49).

### `apps/mobile/app/(tabs)/planner.tsx`
**Reescrita completa.** Substitui o stub actual por:
- Bloqueio Premium via `PLANS[profile.plano].features.planeamento_semanal` (de `@emealia/config`), renderizando `<PremiumLock mensagem="..." />` em vez da grelha quando `false`. Ecrã de loading (`ActivityIndicator`) enquanto `profileLoading`.
- Estado local `semanaInicio` (default `segundaFeiraDaSemana()` de `@/constants/planner`) e `<WeekNavigator />` para navegar ±1 semana via `adicionarSemanas`.
- `usePlanner(user?.id, semanaInicio, podeAceder)` para os dados/CRUD da semana actual — o `enabled=podeAceder` evita fetch desnecessário quando o utilizador está bloqueado.
- `useSavedRecipes(user?.id)` (favoritos) e `usePantry(user?.id)` (despensa) — já existentes, reutilizados tal como em `search.tsx`/`favoritos.tsx`.
- `usePlannerMacros(items, favoritos)` para a barra de macros por dia.
- `useShoppingList(user?.id)` — `addFromSemana` já existente, reutilizado sem alterações.
- Estado local `itemEmMovimento: MealPlanItem | null` (modo "mover") e `slotAlvo: { dia: number; momento: Momento } | null` (slot alvo do modal de escolha de receita).
- `handleSlotPress(dia, momento, itemExistente)`: se `itemEmMovimento` estiver definido, confirma (via `Alert.alert`, só se `itemExistente` não for nulo) e chama `moveSlot`; caso contrário, se `itemExistente` existir entra em modo "mover" (`setItemEmMovimento(itemExistente)`), senão abre o modal (`setSlotAlvo({ dia, momento })`).
- `handleTrocar(item)`: abre o modal com `slotAlvo` apontado para a posição do próprio `item` (o `assignSlot` subsequente faz `upsert` na mesma posição, ou seja, `update` em vez de novo registo).
- `handleSelecionarReceita(receita)`: chama `assignSlot(slotAlvo.dia, slotAlvo.momento, receita)` e fecha o modal.
- `handleGerarListaSemana()`: igual à lógica actual (`addFromSemana` + `Alert.alert`), mas conta `items.filter(i => i.fonte && i.fonte !== 'spoonacular').length` e concatena ao alerta um aviso quando > 0: `"\n\nX receita(s) de vídeo não têm ingredientes estruturados e não entraram na lista."`
- Renderiza `<PlannerGrid />` (ou `ActivityIndicator` enquanto `loading`), texto inline "A mover ... — toca no slot de destino" quando `itemEmMovimento` estiver definido, botão "Gerar lista da semana", e `<PlannerRecipePickerModal visible={!!slotAlvo} ... />`.
- **Se o ficheiro ultrapassar 150 linhas** (é provável, dado o número de handlers), extrair os handlers de `handleSlotPress`/`handleTrocar`/`handleSelecionarReceita` para um hook local `usePlannerScreenState.ts` dentro de `src/hooks/`, mantendo `planner.tsx` só com JSX + chamadas.

## Ficheiros a Eliminar

### `apps/mobile/src/hooks/useMealPlanWeek.ts`
Substituído por `usePlanner.ts` (mesma responsabilidade de leitura + novo CRUD). Único ponto de uso confirmado: `apps/mobile/app/(tabs)/planner.tsx` (grep confirmou nenhum outro import).

## Fases de Implementação

### Fase 1: Backend — schema + Edge Functions
**Ficheiros:**
- Criar `supabase/functions/_shared/macros.ts`
- Modificar `supabase/schema.sql` (UNIQUE constraint)
- Modificar `supabase/functions/search-recipes/index.ts` (import shared)
- Modificar `supabase/functions/recipe-ingredients/index.ts` (macros + cache key v2)

**Critérios de sucesso (automáticos):**
- [ ] `supabase db push` (ou execução manual do `schema.sql`) sem erros
- [ ] `supabase functions deploy recipe-ingredients search-recipes` sem erros de build Deno

**Critérios de sucesso (manuais):**
- [ ] Chamar `recipe-ingredients` com um `recipeId` Spoonacular válido e confirmar que a resposta inclui `{ ingredientes: [...], macros: { calorias, proteinas, hidratos, gorduras } }`
- [ ] Confirmar em `pg_constraint` (ou via insert duplicado de teste) que a UNIQUE constraint está activa

### Fase 2: Camada de dados — queries, store, hooks
**Ficheiros:**
- Modificar `packages/supabase/src/queries/meal_plan.ts` (`upsertMealPlanSlot`, `deleteMealPlanSlot`)
- Criar `apps/mobile/src/stores/plannerStore.ts`
- Criar `apps/mobile/src/hooks/usePlanner.ts`
- Criar `apps/mobile/src/hooks/useRecipeMacros.ts`
- Criar `apps/mobile/src/hooks/usePlannerMacros.ts`
- Eliminar `apps/mobile/src/hooks/useMealPlanWeek.ts`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` sem erros

**Critérios de sucesso (manuais):**
- [ ] Nenhum — validado indirectamente nas fases seguintes via UI

### Fase 3: Ecrã base — bloqueio Premium + navegação de semanas
**Ficheiros:**
- Criar `apps/mobile/src/constants/planner.ts`
- Criar `apps/mobile/src/components/planner/WeekNavigator.tsx`
- Modificar `apps/mobile/app/(tabs)/planner.tsx` (esqueleto: gate Premium + `WeekNavigator`, grelha ainda vazia/placeholder)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` sem erros
- [ ] `expo lint` sem warnings

**Critérios de sucesso (manuais):**
- [ ] Utilizador com `plano: 'free'` vê `PremiumLock` ao abrir o separador Planeamento, sem qualquer grelha visível
- [ ] Utilizador Premium vê o cabeçalho + `WeekNavigator`; avançar/recuar semana actualiza o label "Semana de DD/M – DD/M"

### Fase 4: Grelha semanal — slots, swipe, tap-to-move
**Ficheiros:**
- Criar `apps/mobile/src/components/planner/DayMacroBar.tsx` (placeholder de macros — valores reais só na Fase 6)
- Criar `apps/mobile/src/components/planner/PlannerSlotCard.tsx`
- Criar `apps/mobile/src/components/planner/PlannerSlotEmpty.tsx`
- Criar `apps/mobile/src/components/planner/PlannerDayRow.tsx`
- Criar `apps/mobile/src/components/planner/PlannerGrid.tsx`
- Modificar `apps/mobile/app/(tabs)/planner.tsx` (ligar `usePlanner`, `itemEmMovimento`, `handleSlotPress`, `PlannerGrid`)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` sem erros

**Critérios de sucesso (manuais):**
- [ ] Slots vazios mostram "+ Adicionar"; slots ocupados mostram o título da receita
- [ ] Tocar num slot ocupado entra em modo "mover" (destaque visual); tocar noutro slot conclui a mudança e persiste em `meal_plan` (confirmar reload do ecrã mantém a nova posição)
- [ ] Mover para um slot já ocupado pede confirmação antes de substituir
- [ ] Swipe num slot ocupado revela "trocar" e "remover"; "remover" pede confirmação e elimina o registo; confirmar não sobra nenhuma linha duplicada em `meal_plan` após várias trocas/movimentos

### Fase 5: Adicionar/trocar receita via modal
**Ficheiros:**
- Criar `apps/mobile/src/components/planner/PlannerFavoritosTab.tsx`
- Criar `apps/mobile/src/components/planner/PlannerSearchTab.tsx`
- Criar `apps/mobile/src/components/planner/PlannerRecipePickerModal.tsx`
- Modificar `apps/mobile/app/(tabs)/planner.tsx` (`slotAlvo`, `handleTrocar`, `handleSelecionarReceita`, montar `PlannerRecipePickerModal`)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` sem erros

**Critérios de sucesso (manuais):**
- [ ] Tocar num slot vazio abre o modal na tab Favoritos por default; seleccionar uma receita preenche o slot
- [ ] Trocar para a tab Pesquisar, procurar por ingrediente e seleccionar um resultado preenche o slot com `fonte: 'spoonacular'`
- [ ] "Trocar" (swipe num slot ocupado) abre o mesmo modal e a nova selecção substitui a receita anterior sem criar novo registo (confirmar só 1 linha em `meal_plan` para essa posição)

### Fase 6: Macros diários
**Ficheiros:**
- Modificar `apps/mobile/src/components/planner/DayMacroBar.tsx` (já criado na Fase 4 — ligar props reais)
- Modificar `apps/mobile/app/(tabs)/planner.tsx` (ligar `usePlannerMacros`)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` sem erros

**Critérios de sucesso (manuais):**
- [ ] Dia com receitas Spoonacular guardadas em favoritos mostra soma correcta de calorias
- [ ] Dia com receita Spoonacular não guardada em favoritos também mostra macros (via `recipe-ingredients` estendida)
- [ ] Dia com receita de vídeo (YouTube/TikTok/Instagram) mostra badge "parcial" e soma apenas as receitas com macros conhecidos

### Fase 7: Gerar lista de compras da semana + aviso de vídeo
**Ficheiros:**
- Modificar `apps/mobile/app/(tabs)/planner.tsx` (`handleGerarListaSemana` com contagem de receitas de vídeo ignoradas)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` sem erros

**Critérios de sucesso (manuais):**
- [ ] Semana só com receitas Spoonacular: gera lista normalmente, sem aviso
- [ ] Semana com mistura de Spoonacular + vídeo: gera lista (só ingredientes Spoonacular) e mostra aviso a mencionar quantas receitas de vídeo foram ignoradas
- [ ] Semana vazia: mostra alerta "Ainda não tens receitas planeadas para esta semana", sem chamar `addFromSemana`

## Estratégia de Testes
- **Automático:** `tsc --noEmit` no final de cada fase (regra do CLAUDE.md); `expo lint` pelo menos uma vez no fim.
- **Manual (simulador iOS ou Android via `npx expo start`):** percorrer os critérios manuais de cada fase, com particular atenção a:
  - Confirmar no Supabase Studio (tabela `meal_plan`) que não há linhas duplicadas por `(user_id, semana_inicio, dia_semana, momento)` depois de várias operações de mover/trocar.
  - Testar em ecrã pequeno (iPhone SE / Android compacto) que as 4 células de momento por dia continuam legíveis — é o trade-off assinalado na nota de arquitectura.
  - Testar com conta `plano: 'free'` e com conta Premium (mudar manualmente a coluna `plano` em `profiles` no Supabase Studio, dado que RevenueCat sandbox não faz parte desta ticket).

## Notas de Implementação

- **Nunca** editar `react-native-reanimated` para v4 nem instalar biblioteca de drag-and-drop — o tap-to-move evita essa necessidade (decisão tomada, ver secção "Decisões tomadas").
- Cache Redis de `recipe-ingredients` continua a 1h (`CACHE_TTL_SECONDS = 3600`, obrigatório por ToS Spoonacular) — só a `cacheKey` muda de versão (`v2`) para invalidar entradas antigas sem `macros`.
- `usePlannerMacros` faz chamadas de rede sequenciais (`for...of` com `await`) em vez de `Promise.all` — aceitável para o volume esperado (máx. 28 slots/semana), simplicidade > paralelismo aqui; revisitar só se houver queixas reais de performance.
- **`FEATURES.md`** já está marcado (localmente, por commitar) como `F09 ... DONE` — isto deixa de ser uma inconsistência assim que esta spec for implementada e validada; não é necessário nenhum ficheiro adicional a modificar por causa disso.
- A UNIQUE constraint (`meal_plan_slot_unique`) é aditiva e idempotente (bloco `DO $$ ... IF NOT EXISTS`), seguro para reexecutar `schema.sql` várias vezes, consistente com o resto do ficheiro.
- Nenhuma alteração a `packages/types/src/planner.ts` — `MealPlanItem` mantém-se sem campo de macros (os macros são sempre calculados em runtime, nunca persistidos em `meal_plan`).

## Referências
- Research: `thoughts/shared/research/2026-07-27-planeamento-semanal.md`
- Ticket: `thoughts/shared/tickets/2026-07-27-planeamento-semanal.md`
- Padrão de swipe: `apps/mobile/src/components/pantry/PantryItemCard.tsx`
- Padrão de store+hook: `apps/mobile/src/hooks/useShoppingList.ts` + `apps/mobile/src/stores/shoppingListStore.ts`
- Padrão de modal: `apps/mobile/src/components/recipe/RecipeDetailModal.tsx`
- Extracção de macros (origem): `supabase/functions/search-recipes/index.ts:30-40`
