---
data: 2026-07-24
feature: "Lista de Compras Automática (F07)"
research: "thoughts/shared/research/2026-07-24-lista-de-compras.md"
status: completo
---

# Spec: Lista de Compras Automática (F07)

## Visão Geral
Implementa o ecrã de lista de compras (modal acessível a partir da despensa/receita/planner), a geração automática de itens em falta a partir de uma receita Spoonacular ou do plano semanal (comparando com `pantry_items`), CRUD manual, partilha via texto, e exportação Premium para Apple Reminders (iOS) / Google Tasks (Android).

## Decisões tomadas (esclarecidas antes desta spec)
1. **Fonte de ingredientes estruturados:** nova Edge Function `recipe-ingredients`, chamada sob-demanda no momento de "adicionar à lista" (não estende `search-recipes`, não persiste em `saved_recipes`).
2. **Navegação:** sem 7º tab — modal acessível a partir da Despensa (ponto de entrada estável), da receita (pesquisa e favoritos) e do planner.
3. **Exportação nativa:** incluída nesta spec (expo-calendar para Reminders iOS + Google Sign-In/Tasks API para Android), assumindo que será necessário construir um dev client (`eas build --profile development`) para testar — não funciona em Expo Go.
4. **`meal_plan`:** cria-se a camada mínima de tipos/queries. A função "gerar lista da semana" fica implementada mas só é testável end-to-end quando o planner (F09) popular `meal_plan`.

## Decisões técnicas de implementação (não requerem confirmação do utilizador)
- **Normalização de nomes:** client-side, simples — `lowercase + remover diacríticos (NFD) + trim + heurística de plural simples (remover 's' final)`. Mesma filosofia do comparador case-insensitive já usado em `useRecipeSearch.ts:36,52`. Sem função nova no Supabase.
- **Deduplicação ao regenerar lista:** sem coluna nova em `shopping_list` para "semana de origem" — a comparação re-deriva sempre contra `pantry_items` **e** contra os itens já presentes em `shopping_list` (evita duplicar ao gerar a lista da semana mais do que uma vez).
- **Receitas de vídeo (YouTube/TikTok/Instagram) sem ID Spoonacular:** não têm ingredientes estruturados disponíveis. O botão "Adicionar à lista" fica desativado para `fonte !== 'spoonacular'`, com texto explicativo — só a adição manual serve essas receitas nesta fase.
- **Consolidação de quantidades duplicadas** (ex.: mesmo ingrediente em duas receitas da semana): mantém-se a quantidade da primeira ocorrência; não há soma de unidades heterogéneas. Limitação documentada, não bloqueante para o MVP.

---

## Ficheiros a Criar

### `packages/supabase/src/queries/shopping_list.ts`
**Propósito:** query functions para `shopping_list`, seguindo a forma de `packages/supabase/src/queries/pantry.ts`.
**Conteúdo:**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, ShoppingListItem } from '@emealia/types';

type ShoppingListInsert = Database['public']['Tables']['shopping_list']['Insert'];

export async function getShoppingList(client: SupabaseClient<Database>, userId: string) {
  return client.from('shopping_list').select('*').eq('user_id', userId).order('created_at', { ascending: false });
}

export async function addShoppingListItem(client: SupabaseClient<Database>, item: ShoppingListInsert) {
  return client.from('shopping_list').insert(item).select().single();
}

export async function addShoppingListItems(client: SupabaseClient<Database>, items: ShoppingListInsert[]) {
  return client.from('shopping_list').insert(items).select();
}

export async function updateShoppingListItem(
  client: SupabaseClient<Database>,
  id: string,
  updates: Partial<ShoppingListItem>
) {
  return client.from('shopping_list').update(updates).eq('id', id).select().single();
}

export async function deleteShoppingListItem(client: SupabaseClient<Database>, id: string) {
  return client.from('shopping_list').delete().eq('id', id);
}

export async function clearShoppingList(client: SupabaseClient<Database>, userId: string) {
  return client.from('shopping_list').delete().eq('user_id', userId);
}
```

### `packages/supabase/src/queries/meal_plan.ts`
**Propósito:** query mínima para `meal_plan` (tabela existe no schema mas não tem camada de queries).
**Conteúdo:**
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@emealia/types';

export async function getMealPlanSemana(client: SupabaseClient<Database>, userId: string, semanaInicio: string) {
  return client
    .from('meal_plan')
    .select('*')
    .eq('user_id', userId)
    .eq('semana_inicio', semanaInicio)
    .order('dia_semana', { ascending: true });
}
```

### `packages/types/src/planner.ts`
**Propósito:** tipo `MealPlanItem`, ausente do pacote de tipos (research confirmou que `meal_plan` nunca foi tipado).
**Conteúdo:**
```typescript
import type { Momento } from './user';
import type { RecipeSource } from './recipe';

export interface MealPlanItem {
  id:            string;
  user_id:       string;
  semana_inicio: string;
  dia_semana:    number;
  momento:       Momento;
  recipe_id:     string | null;
  titulo:        string | null;
  fonte:         RecipeSource | null;
  created_at:    string;
}
```

### `supabase/functions/recipe-ingredients/index.ts`
**Propósito:** Edge Function nova que devolve ingredientes estruturados (nome + quantidade) de uma receita Spoonacular, via `GET /recipes/{id}/information` (não `informationBulk`, que é só para pesquisa em lote). Segue o padrão de cache Redis 1h de `search-recipes`/`autocomplete-ingredients`.
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
  const { recipeId } = await req.json();

  if (!recipeId || !/^\d+$/.test(String(recipeId))) {
    return new Response(
      JSON.stringify({ ingredientes: [], error: 'recipeId inválido — só receitas Spoonacular têm ingredientes estruturados' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const cacheKey = `spoonacular:ingredients:${recipeId}`;
  const cached = await redis.get<{ nome: string; quantidade: string | null }[]>(cacheKey);
  if (cached) {
    return new Response(JSON.stringify({ ingredientes: cached }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const params = new URLSearchParams({ includeNutrition: 'false', apiKey: SPOONACULAR_API_KEY });
  const res = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?${params}`);

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`[recipe-ingredients] Spoonacular respondeu ${res.status}:`, errorBody);
    return new Response(
      JSON.stringify({ ingredientes: [], error: `Spoonacular API error (${res.status})` }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const data = await res.json();
  const ingredientes = (data.extendedIngredients ?? []).map((i: any) => ({
    nome:       i.name as string,
    quantidade: i.amount != null && i.unit ? `${i.amount} ${i.unit}`.trim() : null,
  }));

  await redis.set(cacheKey, ingredientes, { ex: CACHE_TTL_SECONDS });

  return new Response(JSON.stringify({ ingredientes }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

### `apps/mobile/src/stores/shoppingListStore.ts`
**Propósito:** store Zustand, mesmo padrão de `pantryStore.ts`, com `addItems` em lote (necessário para inserções vindas de receita/semana).
**Conteúdo:**
```typescript
import { create } from 'zustand';
import type { ShoppingListItem } from '@emealia/types';

interface ShoppingListState {
  items:        ShoppingListItem[];
  loading:      boolean;
  loadedUserId: string | null;
  setItems:     (userId: string, items: ShoppingListItem[]) => void;
  setLoading:   (loading: boolean) => void;
  addItem:      (item: ShoppingListItem) => void;
  addItems:     (items: ShoppingListItem[]) => void;
  updateItem:   (item: ShoppingListItem) => void;
  removeItem:   (id: string) => void;
  clear:        () => void;
  reset:        () => void;
}

export const useShoppingListStore = create<ShoppingListState>((set) => ({
  items:        [],
  loading:      true,
  loadedUserId: null,
  setItems:     (userId, items) => set({ items, loadedUserId: userId, loading: false }),
  setLoading:   (loading) => set({ loading }),
  addItem:      (item)  => set((s) => ({ items: [item, ...s.items] })),
  addItems:     (items) => set((s) => ({ items: [...items, ...s.items] })),
  updateItem:   (item)  => set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) })),
  removeItem:   (id)    => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear:        ()      => set({ items: [] }),
  reset:        ()      => set({ items: [], loadedUserId: null, loading: false }),
}));
```

### `apps/mobile/src/constants/shopping.ts`
**Propósito:** normalização de nomes, agrupamento por `comprado` para `SectionList`, e consolidação de ingredientes duplicados.
**Conteúdo:**
```typescript
import type { ShoppingListItem } from '@emealia/types';

export function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/s$/, '');
}

export function agruparPorComprado(items: ShoppingListItem[]) {
  return [
    { comprado: false, label: 'Por comprar', data: items.filter((i) => !i.comprado) },
    { comprado: true,  label: 'Comprados',   data: items.filter((i) => i.comprado) },
  ].filter((section) => section.data.length > 0);
}

export function consolidarIngredientes(
  ingredientes: { nome: string; quantidade: string | null }[]
): { nome: string; quantidade: string | null }[] {
  const vistos = new Map<string, { nome: string; quantidade: string | null }>();
  for (const ing of ingredientes) {
    const chave = normalizarNome(ing.nome);
    if (!vistos.has(chave)) vistos.set(chave, ing);
  }
  return [...vistos.values()];
}
```

### `apps/mobile/src/hooks/useShoppingList.ts`
**Propósito:** hook principal, mesmo padrão de `usePantry.ts`/`useSavedRecipes.ts`. Centraliza CRUD + lógica de "adicionar em falta" (usada tanto por receita individual como por consolidação semanal).
**Conteúdo:**
```typescript
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import {
  getShoppingList,
  addShoppingListItem,
  addShoppingListItems,
  updateShoppingListItem,
  deleteShoppingListItem,
  clearShoppingList,
} from '@emealia/supabase';
import { useShoppingListStore } from '@/stores/shoppingListStore';
import { normalizarNome, consolidarIngredientes } from '@/constants/shopping';
import type { PantryItem, MealPlanItem } from '@emealia/types';

type Ingrediente = { nome: string; quantidade: string | null };

export function useShoppingList(userId: string | undefined) {
  const items   = useShoppingListStore((s) => s.items);
  const loading = useShoppingListStore((s) => s.loading);

  useEffect(() => {
    if (!userId) {
      useShoppingListStore.getState().reset();
      return;
    }
    if (useShoppingListStore.getState().loadedUserId === userId) return;
    fetchItems(userId);
  }, [userId]);

  async function fetchItems(uid: string) {
    useShoppingListStore.getState().setLoading(true);
    const { data, error } = await getShoppingList(supabase!, uid);
    if (error) console.error('[useShoppingList] getShoppingList falhou:', error);
    useShoppingListStore.getState().setItems(uid, data ?? []);
  }

  async function addManual(nome: string, quantidade: string | null) {
    if (!userId) return;
    const { data, error } = await addShoppingListItem(supabase!, {
      user_id: userId, nome, quantidade, comprado: false, recipe_id: null,
    });
    if (error) { console.error('[useShoppingList] addShoppingListItem falhou:', error); return; }
    if (data) useShoppingListStore.getState().addItem(data);
  }

  async function inserirFaltantes(ingredientes: Ingrediente[], recipeId: string | null, pantryItems: PantryItem[]) {
    if (!userId) return 0;
    const pantryNomes   = new Set(pantryItems.map((p) => normalizarNome(p.nome)));
    const listaNomes    = new Set(useShoppingListStore.getState().items.map((i) => normalizarNome(i.nome)));
    const faltam        = ingredientes.filter((ing) => {
      const chave = normalizarNome(ing.nome);
      return !pantryNomes.has(chave) && !listaNomes.has(chave);
    });
    if (faltam.length === 0) return 0;

    const { data, error } = await addShoppingListItems(
      supabase!,
      faltam.map((ing) => ({
        user_id: userId, nome: ing.nome, quantidade: ing.quantidade, comprado: false, recipe_id: recipeId,
      }))
    );
    if (error) { console.error('[useShoppingList] addShoppingListItems falhou:', error); return 0; }
    if (data) useShoppingListStore.getState().addItems(data);
    return data?.length ?? 0;
  }

  async function addFromRecipe(recipeId: string, ingredientes: Ingrediente[], pantryItems: PantryItem[]) {
    return inserirFaltantes(ingredientes, recipeId, pantryItems);
  }

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

  async function toggleComprado(id: string, comprado: boolean) {
    const { data, error } = await updateShoppingListItem(supabase!, id, { comprado });
    if (error) { console.error('[useShoppingList] updateShoppingListItem falhou:', error); return; }
    if (data) useShoppingListStore.getState().updateItem(data);
  }

  async function remove(id: string) {
    const { error } = await deleteShoppingListItem(supabase!, id);
    if (error) { console.error('[useShoppingList] deleteShoppingListItem falhou:', error); return; }
    useShoppingListStore.getState().removeItem(id);
  }

  async function clear() {
    if (!userId) return;
    const { error } = await clearShoppingList(supabase!, userId);
    if (error) { console.error('[useShoppingList] clearShoppingList falhou:', error); return; }
    useShoppingListStore.getState().clear();
  }

  function refetch() {
    if (userId) fetchItems(userId);
  }

  return { items, loading, addManual, addFromRecipe, addFromSemana, toggleComprado, remove, clear, refetch };
}
```

### `apps/mobile/src/hooks/useRecipeIngredients.ts`
**Propósito:** invoca a Edge Function `recipe-ingredients` sob-demanda (não é polling/debounce como o autocomplete — só dispara quando o utilizador pede para adicionar à lista).
**Conteúdo:**
```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useRecipeIngredients() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function fetchIngredients(recipeId: string) {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('recipe-ingredients', { body: { recipeId } });
    setLoading(false);
    if (error) { setError(error.message); return []; }
    return (data?.ingredientes ?? []) as { nome: string; quantidade: string | null }[];
  }

  return { fetchIngredients, loading, error };
}
```

### `apps/mobile/src/hooks/useMealPlanWeek.ts`
**Propósito:** hook mínimo para ler `meal_plan` da semana actual — usado por "gerar lista da semana"; sem UI de planner por trás ainda (F09 continua stub).
**Conteúdo:**
```typescript
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMealPlanSemana } from '@emealia/supabase';
import type { MealPlanItem } from '@emealia/types';

export function useMealPlanWeek(userId: string | undefined) {
  const [loading, setLoading] = useState(false);

  async function fetchSemana(semanaInicio: string): Promise<MealPlanItem[]> {
    if (!userId) return [];
    setLoading(true);
    const { data, error } = await getMealPlanSemana(supabase!, userId, semanaInicio);
    setLoading(false);
    if (error) { console.error('[useMealPlanWeek] getMealPlanSemana falhou:', error); return []; }
    return data ?? [];
  }

  return { fetchSemana, loading };
}
```

### `apps/mobile/src/components/shopping/ShoppingListItemRow.tsx`
**Propósito:** linha de item com checkbox, nome/quantidade riscados quando `comprado`, e botão eliminar. Sob 150 linhas.
**Conteúdo:**
- `Pressable` de checkbox (`Ionicons name={item.comprado ? 'checkbox' : 'square-outline'}`) chamando `onToggle()`
- `Text` com `textDecorationLine: item.comprado ? 'line-through' : 'none'`
- Botão eliminar (`Ionicons name="trash-outline"`) chamando `onDelete()`
- Estilo: segue o padrão inline de `PantryItemCard.tsx` (cores/spacing via `@/constants/theme`)

### `apps/mobile/src/components/shopping/ShoppingListAddForm.tsx`
**Propósito:** input + autocomplete (reutiliza `IngredientAutocompleteList` e `useIngredientAutocomplete`) + botão adicionar. Sob 150 linhas.
**Conteúdo:**
```typescript
import { useState } from 'react';
import { View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IngredientAutocompleteList } from '@/components/pantry/IngredientAutocompleteList';
import { useIngredientAutocomplete } from '@/hooks/useIngredientAutocomplete';
import { spacing } from '@/constants/theme';

interface ShoppingListAddFormProps {
  onAdd: (nome: string) => void;
}

export function ShoppingListAddForm({ onAdd }: ShoppingListAddFormProps) {
  const [texto, setTexto] = useState('');
  const suggestions = useIngredientAutocomplete(texto);

  function submit(nome: string) {
    if (!nome.trim()) return;
    onAdd(nome.trim());
    setTexto('');
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Input placeholder="Adicionar item…" value={texto} onChangeText={setTexto} onSubmitEditing={() => submit(texto)} />
      {suggestions.length > 0 && <IngredientAutocompleteList suggestions={suggestions} onSelect={submit} />}
      <Button label="+ Adicionar" onPress={() => submit(texto)} disabled={!texto.trim()} />
    </View>
  );
}
```

### `apps/mobile/src/components/shopping/ShoppingListModal.tsx`
**Propósito:** modal principal da lista de compras — o ecrã da feature. Sob 150 linhas (extrair `ShoppingListItemRow`/`ShoppingListAddForm` já feito acima para caber).
**Conteúdo:**
- `Modal` (mesmo padrão de `RecipeDetailModal.tsx`: `animationType="slide"`, `onRequestClose`)
- `SectionList` com `agruparPorComprado(items)`, `renderItem` → `ShoppingListItemRow`
- `ShoppingListAddForm` no topo, chamando `onAdd={(nome) => addManual(nome, null)}`
- Botões de rodapé:
  - "Partilhar" → `Share.share({ message: formatarListaTexto(items) })` (helper local, junta `- nome (quantidade)` por linha, agrupado por comprado/por comprar)
  - "Exportar para Lembretes/Tasks" — gated: se `profile?.plano === 'free'`, mostra `Card` com mensagem de upgrade (mesmo padrão de `pantry.tsx:71-79`) em vez de executar; senão chama `useShoppingListExport().exportItems(items.filter(i => !i.comprado))`
  - "Limpar lista" → `Alert.alert('Limpar lista', 'Eliminar todos os itens?', [...])` com confirmação, chama `clear()`
- Props: `visible`, `onClose`, `userId`, `profile` (para gating) — a instância de `useShoppingList(userId)` vive dentro do modal para ficar reutilizável de qualquer ecrã sem duplicar estado (a store Zustand global evita refetch duplicado entre pontos de entrada)

### `apps/mobile/src/lib/reminders.ts`
**Propósito:** exportação para Apple Reminders via EventKit (`expo-calendar`), só iOS.
**Conteúdo:**
```typescript
import * as Calendar from 'expo-calendar';

export async function exportToReminders(items: { nome: string; quantidade: string | null }[]) {
  const { status } = await Calendar.requestRemindersPermissionsAsync();
  if (status !== 'granted') return { success: false, error: 'Permissão de Lembretes negada' };

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
  const defaultCalendar = calendars.find((c) => c.allowsModifications) ?? calendars[0];
  if (!defaultCalendar) return { success: false, error: 'Nenhum calendário de Lembretes disponível' };

  for (const item of items) {
    await Calendar.createReminderAsync(defaultCalendar.id, {
      title: item.quantidade ? `${item.nome} (${item.quantidade})` : item.nome,
    });
  }
  return { success: true, count: items.length };
}
```

### `apps/mobile/src/lib/googleTasks.ts`
**Propósito:** exportação para Google Tasks via OAuth (`@react-native-google-signin/google-signin`) + REST API, só Android.
**Conteúdo:**
```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  scopes: ['https://www.googleapis.com/auth/tasks'],
});

export async function exportToGoogleTasks(items: { nome: string; quantidade: string | null }[]) {
  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signIn();
  const { accessToken } = await GoogleSignin.getTokens();

  for (const item of items) {
    await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.quantidade ? `${item.nome} (${item.quantidade})` : item.nome }),
    });
  }
  return { success: true, count: items.length };
}
```

### `apps/mobile/src/hooks/useShoppingListExport.ts`
**Propósito:** escolhe a implementação certa por plataforma; usado pelo `ShoppingListModal`.
**Conteúdo:**
```typescript
import { Platform } from 'react-native';
import { useState } from 'react';
import { exportToReminders } from '@/lib/reminders';
import { exportToGoogleTasks } from '@/lib/googleTasks';

export function useShoppingListExport() {
  const [loading, setLoading] = useState(false);

  async function exportItems(items: { nome: string; quantidade: string | null }[]) {
    setLoading(true);
    const result = Platform.OS === 'ios' ? await exportToReminders(items) : await exportToGoogleTasks(items);
    setLoading(false);
    return result;
  }

  return { exportItems, loading };
}
```

---

## Ficheiros a Modificar

### `packages/types/src/database.ts`
**Modificações:**
- [ ] Adicionar import: `import type { MealPlanItem } from './planner';`
- [ ] Adicionar entrada `meal_plan` em `Tables`, seguindo a forma de `shopping_list`:
```typescript
meal_plan: {
  Row:           Simplify<MealPlanItem>;
  Insert:        Simplify<Omit<MealPlanItem, 'id' | 'created_at'>>;
  Update:        Simplify<Partial<MealPlanItem>>;
  Relationships: [];
};
```

### `packages/types/src/recipe.ts`
**Modificações:**
- [ ] Adicionar tipo `RecipeIngredient` (usado pelas respostas de `recipe-ingredients` e pelas funções `addFromRecipe`/`addFromSemana`):
```typescript
export interface RecipeIngredient {
  nome:       string;
  quantidade: string | null;
}
```

### `packages/types/src/index.ts`
**Modificações:**
- [ ] Adicionar `export * from './planner';`

### `packages/supabase/src/index.ts`
**Modificações:**
- [ ] Adicionar `export * from './queries/shopping_list';`
- [ ] Adicionar `export * from './queries/meal_plan';`

### `apps/mobile/app/(tabs)/pantry.tsx`
**Modificações:** ponto de entrada estável para a lista de compras (Despensa ↔ Lista de Compras é o par conceptual mais próximo).
- [ ] Import: `import { ShoppingListModal } from '@/components/shopping/ShoppingListModal';`
- [ ] Novo estado: `const [listaVisible, setListaVisible] = useState(false);`
- [ ] No header (ao lado do título "Despensa"), adicionar `Button`/ícone "🛒 Lista de compras" com `onPress={() => setListaVisible(true)}`
- [ ] Renderizar `<ShoppingListModal visible={listaVisible} onClose={() => setListaVisible(false)} userId={user?.id} profile={profile} />` no fim do JSX

### `apps/mobile/src/components/recipe/RecipeCard.tsx`
**Modificações:** botão "adicionar à lista" nos resultados de pesquisa (sempre Spoonacular, logo sempre elegível).
- [ ] Adicionar prop `onAddToList: () => void`
- [ ] Adicionar `Pressable` com `Ionicons name="cart-outline"` ao lado do botão de guardar (heart), chamando `onAddToList`

### `apps/mobile/app/(tabs)/search.tsx`
**Modificações:**
- [ ] Import `useShoppingList`, `useRecipeIngredients`, `usePantry` (já importado)
- [ ] `const { addFromRecipe } = useShoppingList(user?.id);`
- [ ] `const { fetchIngredients } = useRecipeIngredients();`
- [ ] Nova função:
```typescript
async function handleAddToList(recipe: RecipeSearchResult) {
  const ingredientes = await fetchIngredients(recipe.id);
  const count = await addFromRecipe(recipe.id, ingredientes, pantryItems);
  Alert.alert(count > 0 ? `${count} itens adicionados à lista` : 'Já tens tudo o que precisas em casa');
}
```
- [ ] Passar `onAddToList={() => handleAddToList(recipe)}` ao `RecipeCard` no `renderItem`

### `apps/mobile/src/components/recipe/RecipeDetailModal.tsx`
**Modificações:** botão "Adicionar à lista de compras" para receitas guardadas (favoritos).
- [ ] Adicionar props: `onAddToList: () => void`, `podeAdicionarLista: boolean` (= `recipe.fonte === 'spoonacular'`), `addingToList?: boolean`
- [ ] Abaixo do botão "Abrir receita original": `<Button label="Adicionar à lista de compras" onPress={onAddToList} disabled={!podeAdicionarLista || addingToList} />`
- [ ] Se `!podeAdicionarLista`, mostrar `Text` explicativo: "Esta receita não tem lista de ingredientes estruturada — adiciona os itens manualmente na lista de compras."

### `apps/mobile/app/(tabs)/favoritos.tsx`
**Modificações:**
- [ ] Import `useShoppingList`, `useRecipeIngredients`, `usePantry`
- [ ] `const { items: pantryItems } = usePantry(user?.id);`
- [ ] `const { addFromRecipe } = useShoppingList(user?.id);`
- [ ] `const { fetchIngredients } = useRecipeIngredients();`
- [ ] Função `handleAddToList(recipe: SavedRecipe)` — mesmo corpo que em `search.tsx`, usando `recipe.recipe_id` em vez de `recipe.id`
- [ ] Passar `onAddToList`, `podeAdicionarLista={detalheRecipe?.fonte === 'spoonacular'}` ao `RecipeDetailModal`

### `apps/mobile/app/(tabs)/planner.tsx`
**Modificações:** wiring mínimo de "gerar lista da semana" (sem construir UI de planner — fora de escopo, ver secção "Fora do Escopo" do research). Substitui o stub actual.
- [ ] Import `useAuth`, `useProfile`, `usePantry`, `useMealPlanWeek`, `useShoppingList`, `Button`, tokens de tema
- [ ] Calcular `semanaInicio` (segunda-feira da semana actual, formato `YYYY-MM-DD`)
- [ ] Botão "Gerar lista da semana" → `fetchSemana(semanaInicio)` → `addFromSemana(mealPlanItems, pantryItems)` → `Alert` com resultado (incluindo caso `mealPlanItems.length === 0`: "Ainda não tens receitas planeadas para esta semana")
- [ ] Manter texto "F09 — Planeamento semanal (Premium)" como placeholder do resto do ecrã

### `apps/mobile/app.json`
**Modificações:**
- [ ] Adicionar a `ios.infoPlist`: `"NSRemindersUsageDescription": "Usado para exportar a lista de compras para os teus Lembretes."`
- [ ] Adicionar a `plugins`:
```json
["expo-calendar", { "remindersPermission": "Usado para exportar a lista de compras para os teus Lembretes." }]
```
- [ ] Adicionar plugin `@react-native-google-signin/google-signin` (config plugin próprio do pacote, sem opções adicionais necessárias)

### `apps/mobile/package.json`
**Modificações:**
- [ ] `npm install expo-calendar@~14.1.4` (versão fixada para Expo SDK 53 — não usar `npx expo install`, conforme regra do projecto)
- [ ] `npm install @react-native-google-signin/google-signin` — **confirmar antes de instalar** a versão mais recente compatível com Expo 53 / RN 0.79 (não fixada nesta spec por incerteza; validar changelog do pacote antes de fixar)

### `.env` (não commitado — actualizar localmente e documentar no `.env.example` se existir)
**Modificações:**
- [ ] Adicionar `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=` (Web Client ID do OAuth consent screen do Google Cloud, necessário para `GoogleSignin.configure`; é público por natureza — cliente, não secreto — logo elegível para prefixo `EXPO_PUBLIC_`)

---

## Fases de Implementação

### Fase 1: Tipos e schema — base para tudo o resto
**Ficheiros:**
- Criar `packages/types/src/planner.ts`
- Modificar `packages/types/src/database.ts`, `packages/types/src/recipe.ts`, `packages/types/src/index.ts`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` (raiz) passa sem erros no pacote `@emealia/types`

**Critérios de sucesso (manuais):**
- [ ] N/A (sem UI nesta fase)

### Fase 2: Camada de queries Supabase
**Ficheiros:**
- Criar `packages/supabase/src/queries/shopping_list.ts`, `packages/supabase/src/queries/meal_plan.ts`
- Modificar `packages/supabase/src/index.ts`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` passa sem erros no pacote `@emealia/supabase`

### Fase 3: Edge Function `recipe-ingredients`
**Ficheiros:**
- Criar `supabase/functions/recipe-ingredients/index.ts`

**Critérios de sucesso (automáticos):**
- [ ] `supabase functions deploy recipe-ingredients` sem erros

**Critérios de sucesso (manuais):**
- [ ] Chamar a função com um `recipeId` Spoonacular válido devolve `ingredientes` com `nome`/`quantidade` preenchidos
- [ ] Chamar com `recipeId` não numérico devolve `400` com mensagem clara
- [ ] Segunda chamada com o mesmo `recipeId` dentro de 1h é servida do cache Redis (verificar latência/logs)

### Fase 4: Store, hooks e lógica de comparação/normalização (mobile)
**Ficheiros:**
- Criar `apps/mobile/src/stores/shoppingListStore.ts`
- Criar `apps/mobile/src/constants/shopping.ts`
- Criar `apps/mobile/src/hooks/useShoppingList.ts`, `useRecipeIngredients.ts`, `useMealPlanWeek.ts`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` (mobile) passa sem erros

**Critérios de sucesso (manuais):**
- [ ] N/A (sem UI ainda — testável via Fase 5)

### Fase 5: UI — CRUD, ecrã modal, integração nos pontos de entrada
**Ficheiros:**
- Criar `apps/mobile/src/components/shopping/ShoppingListItemRow.tsx`, `ShoppingListAddForm.tsx`, `ShoppingListModal.tsx`
- Modificar `apps/mobile/app/(tabs)/pantry.tsx`, `apps/mobile/src/components/recipe/RecipeCard.tsx`, `apps/mobile/app/(tabs)/search.tsx`, `apps/mobile/src/components/recipe/RecipeDetailModal.tsx`, `apps/mobile/app/(tabs)/favoritos.tsx`, `apps/mobile/app/(tabs)/planner.tsx`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` (mobile) passa sem erros
- [ ] `npm run lint` (mobile) sem warnings
- [ ] Todos os componentes novos sob 150 linhas

**Critérios de sucesso (manuais):**
- [ ] Na Despensa, tocar em "Lista de compras" abre o modal com a lista vazia (utilizador novo)
- [ ] Adicionar item manual com autocomplete funciona e aparece na secção "Por comprar"
- [ ] Marcar/desmarcar checkbox move o item entre secções com risco no texto
- [ ] Eliminar item individual remove-o da lista
- [ ] "Limpar lista" pede confirmação e esvazia a lista
- [ ] Na pesquisa por ingredientes, tocar em "adicionar à lista" numa receita insere só os ingredientes que não estão na despensa
- [ ] Repetir a mesma acção duas vezes não duplica itens (idempotência via `listaNomes`)
- [ ] Nos Favoritos, receita Spoonacular mostra botão activo; receita YouTube/TikTok/Instagram mostra o botão desativado com o texto explicativo
- [ ] "Partilhar" abre a share sheet nativa com a lista formatada em texto
- [ ] No plano `free`, tentar exportar mostra a mensagem de upgrade e não executa a exportação

### Fase 6: Exportação nativa (Reminders iOS + Google Tasks Android) — requer dev client
**Ficheiros:**
- Criar `apps/mobile/src/lib/reminders.ts`, `googleTasks.ts`
- Criar `apps/mobile/src/hooks/useShoppingListExport.ts`
- Modificar `apps/mobile/app.json`, `apps/mobile/package.json`, `.env`
- Ligar `useShoppingListExport` ao botão "Exportar" do `ShoppingListModal` (Fase 5)

**Pré-requisito:** construir um dev client (`eas build --profile development --platform all`) — `expo-calendar`/`google-signin` não funcionam em Expo Go.

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` (mobile) passa sem erros

**Critérios de sucesso (manuais, requerem dev client instalado no dispositivo):**
- [ ] iOS, plano Premium: exportar pede permissão de Lembretes na primeira vez, depois cria um lembrete por item não comprado no calendário de Lembretes por omissão
- [ ] Android, plano Premium: exportar pede login Google (scope Tasks), depois cria uma task por item não comprado na lista "My Tasks" por omissão
- [ ] Negar a permissão/login mostra mensagem de erro sem crash

---

## Estratégia de Testes
- **Unit:** `normalizarNome` (acentos, plural simples, maiúsculas), `consolidarIngredientes` (dedup mantendo primeira ocorrência), `agruparPorComprado` (secções vazias filtradas)
- **Manual:** ver critérios de sucesso manuais por fase acima; Fases 5 e 6 exigem simulador/dispositivo, Fase 6 exige dev client

## Notas de Implementação
- **Quota Spoonacular:** `GET /recipes/{id}/information` conta para a quota diária tal como `informationBulk`; cache Redis de 1h já mitiga chamadas repetidas ao mesmo `recipeId`.
- **`meal_plan` sem UI:** a Fase 4/5 desta spec não cria nenhum ecrã de planeamento — só o mínimo para "gerar lista da semana" não ficar bloqueada quando F09 for implementado. Testar isso end-to-end exige inserir linhas manualmente em `meal_plan` via Supabase Studio até o planner existir.
- **GDPR:** `shopping_list` já tem RLS (`auth.uid() = user_id`); nenhuma alteração de schema nesta spec, logo nenhuma migração adicional necessária.
- **Versão `@react-native-google-signin/google-signin` não fixada:** ao contrário de `expo-calendar` (versão validada na research), este pacote não foi validado contra Expo 53/RN 0.79 nesta spec — confirmar compatibilidade antes de instalar (Fase 6).
- **Risco de escopo da Fase 6:** é a fase de maior incerteza técnica (dois fluxos nativos distintos, OAuth próprio, exige dev build). Se o tempo apertar, as Fases 1-5 já entregam uma feature completa e testável em Expo Go (CRUD, geração automática, partilha por texto) — a exportação Premium pode ficar para uma iteração seguinte sem bloquear o resto.

## Referências
- Research: `thoughts/shared/research/2026-07-24-lista-de-compras.md`
- Padrão hook+store+query: `apps/mobile/src/hooks/usePantry.ts`, `packages/supabase/src/queries/pantry.ts`
- Padrão gating por plano: `apps/mobile/app/(tabs)/pantry.tsx:26-27,71-79`
- Padrão modal de detalhe: `apps/mobile/src/components/recipe/RecipeDetailModal.tsx`
- Padrão Edge Function + cache Redis: `supabase/functions/autocomplete-ingredients/index.ts`, `supabase/functions/search-recipes/index.ts`
