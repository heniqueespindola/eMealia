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
