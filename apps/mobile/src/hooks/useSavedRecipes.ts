import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getSavedRecipes, saveRecipe, unsaveRecipe, updateSavedRecipe, reassignColecao } from '@emealia/supabase';
import { useSavedRecipesStore } from '@/stores/savedRecipesStore';
import type { Database } from '@emealia/types';

type SavedRecipeInsert = Database['public']['Tables']['saved_recipes']['Insert'];

export function useSavedRecipes(userId: string | undefined) {
  const items          = useSavedRecipesStore((s) => s.items);
  const loading        = useSavedRecipesStore((s) => s.loading);
  const customColecoes = useSavedRecipesStore((s) => s.customColecoes);

  useEffect(() => {
    if (!userId) {
      useSavedRecipesStore.getState().reset();
      return;
    }
    if (useSavedRecipesStore.getState().loadedUserId === userId) return;
    fetchItems(userId);
  }, [userId]);

  async function fetchItems(uid: string) {
    useSavedRecipesStore.getState().setLoading(true);
    const { data, error } = await getSavedRecipes(supabase!, uid);
    if (error) console.error('[useSavedRecipes] getSavedRecipes falhou:', error);
    useSavedRecipesStore.getState().setItems(uid, data ?? []);
  }

  async function save(recipe: Omit<SavedRecipeInsert, 'user_id'>) {
    if (!userId) return;
    const { data, error } = await saveRecipe(supabase!, { ...recipe, user_id: userId } as any);
    if (error) { console.error('[useSavedRecipes] saveRecipe falhou:', error); return; }
    if (data) useSavedRecipesStore.getState().addItem(data);
  }

  async function unsave(id: string) {
    const { error } = await unsaveRecipe(supabase!, id);
    if (error) { console.error('[useSavedRecipes] unsaveRecipe falhou:', error); return; }
    useSavedRecipesStore.getState().removeItem(id);
  }

  async function moveToColecao(id: string, colecao: string) {
    const { data, error } = await updateSavedRecipe(supabase!, id, { colecao });
    if (error) { console.error('[useSavedRecipes] updateSavedRecipe falhou:', error); return; }
    if (data) useSavedRecipesStore.getState().updateItem(data);
  }

  function createColecao(nome: string) {
    useSavedRecipesStore.getState().addCustomColecao(nome);
  }

  async function deleteColecao(nome: string) {
    if (!userId) return;
    const { error } = await reassignColecao(supabase!, userId, nome, 'favoritos');
    if (error) { console.error('[useSavedRecipes] reassignColecao falhou:', error); return; }
    useSavedRecipesStore.getState().setItems(
      userId,
      items.map((i) => (i.colecao === nome ? { ...i, colecao: 'favoritos' } : i))
    );
    useSavedRecipesStore.getState().removeCustomColecao(nome);
  }

  function refetch() {
    if (userId) fetchItems(userId);
  }

  return { items, loading, customColecoes, save, unsave, moveToColecao, createColecao, deleteColecao, refetch };
}
