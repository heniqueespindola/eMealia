import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@emealia/types';

export async function getFeaturedCreators(client: SupabaseClient<Database>, limit = 20) {
  return client.from('creators').select('*').eq('destaque', true).order('nome').limit(limit);
}

export async function getCreatorById(client: SupabaseClient<Database>, id: string) {
  return client.from('creators').select('*').eq('id', id).single();
}

export async function getCreatorsByIds(client: SupabaseClient<Database>, ids: string[]) {
  if (ids.length === 0) return { data: [], error: null };
  return client.from('creators').select('*').in('id', ids);
}

export async function getFollowedCreators(client: SupabaseClient<Database>, userId: string) {
  return client.from('followed_creators').select('*').eq('user_id', userId);
}

export async function followCreator(client: SupabaseClient<Database>, userId: string, creatorId: string) {
  return client.from('followed_creators').insert({ user_id: userId, creator_id: creatorId }).select().single();
}

export async function unfollowCreator(client: SupabaseClient<Database>, userId: string, creatorId: string) {
  return client.from('followed_creators').delete().eq('user_id', userId).eq('creator_id', creatorId);
}
