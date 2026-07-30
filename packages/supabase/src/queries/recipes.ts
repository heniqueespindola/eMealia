import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, SavedRecipe } from '@emealia/types';

export async function getSavedRecipes(
  client: SupabaseClient<Database>,
  userId: string,
  colecao?: string
) {
  let query = client
    .from('saved_recipes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (colecao) query = query.eq('colecao', colecao);
  return query;
}

export async function saveRecipe(
  client: SupabaseClient<Database>,
  recipe: Omit<SavedRecipe, 'id' | 'created_at' | 'updated_at'>
) {
  return client.from('saved_recipes').insert(recipe).select().single();
}

export async function unsaveRecipe(client: SupabaseClient<Database>, id: string) {
  return client.from('saved_recipes').delete().eq('id', id);
}

export async function updateSavedRecipe(
  client: SupabaseClient<Database>,
  id: string,
  updates: Partial<SavedRecipe>
) {
  return client.from('saved_recipes').update(updates).eq('id', id).select().single();
}

export async function reassignColecao(
  client: SupabaseClient<Database>,
  userId: string,
  deColecao: string,
  paraColecao = 'favoritos'
) {
  return client
    .from('saved_recipes')
    .update({ colecao: paraColecao })
    .eq('user_id', userId)
    .eq('colecao', deColecao);
}
