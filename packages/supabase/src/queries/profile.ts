import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Profile } from '@emealia/types';

export async function getProfile(client: SupabaseClient<Database>, userId: string) {
  return client.from('profiles').select('*').eq('id', userId).single();
}

export async function updateProfile(
  client: SupabaseClient<Database>,
  userId: string,
  updates: Partial<Profile>
) {
  return client.from('profiles').update(updates).eq('id', userId).select().single();
}
