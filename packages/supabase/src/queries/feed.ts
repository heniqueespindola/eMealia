import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, FiltroDietetico } from '@emealia/types';

export async function getFeed(
  client: SupabaseClient<Database>,
  filtro?: FiltroDietetico,
  limit = 20
) {
  let query = client
    .from('video_cache')
    .select('*')
    .order('views', { ascending: false })
    .limit(limit);

  if (filtro) query = query.contains('filtros', [filtro]);

  return query;
}
