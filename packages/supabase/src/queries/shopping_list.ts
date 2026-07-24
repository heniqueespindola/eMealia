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
