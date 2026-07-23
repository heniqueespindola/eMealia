import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, PantryItem } from '@emealia/types';

export async function getPantry(client: SupabaseClient<Database>, userId: string) {
  return client
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export async function addPantryItem(
  client: SupabaseClient<Database>,
  item: Omit<PantryItem, 'id' | 'created_at'>
) {
  return client.from('pantry_items').insert(item).select().single();
}

export async function deletePantryItem(client: SupabaseClient<Database>, id: string) {
  return client.from('pantry_items').delete().eq('id', id);
}

export async function addPantryItems(
  client: SupabaseClient<Database>,
  items: Omit<PantryItem, 'id' | 'created_at'>[]
) {
  return client.from('pantry_items').insert(items).select();
}
