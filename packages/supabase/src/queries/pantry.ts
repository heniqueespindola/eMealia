import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, PantryItem } from '@emealia/types';

type PantryInsert = Database['public']['Tables']['pantry_items']['Insert'];

export async function getPantry(client: SupabaseClient<Database>, userId: string) {
  return client
    .from('pantry_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
}

export async function addPantryItem(client: SupabaseClient<Database>, item: PantryInsert) {
  return client.from('pantry_items').insert(item).select().single();
}

export async function updatePantryItem(
  client: SupabaseClient<Database>,
  id: string,
  updates: Partial<PantryItem>
) {
  return client.from('pantry_items').update(updates).eq('id', id).select().single();
}

export async function deletePantryItem(client: SupabaseClient<Database>, id: string) {
  return client.from('pantry_items').delete().eq('id', id);
}

export async function addPantryItems(client: SupabaseClient<Database>, items: PantryInsert[]) {
  return client.from('pantry_items').insert(items).select();
}
