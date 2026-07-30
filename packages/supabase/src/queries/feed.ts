import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, FiltroDietetico } from '@emealia/types';

export async function getFeed(
  client: SupabaseClient<Database>,
  filtro?: FiltroDietetico,
  limit = 20,
  creatorChannelIds?: string[]
) {
  let query = client
    .from('video_cache')
    .select('*')
    .order('views', { ascending: false })
    .limit(limit);

  if (filtro) query = query.contains('filtros', [filtro]);
  if (creatorChannelIds) query = query.in('creator_channel_id', creatorChannelIds);

  return query;
}
