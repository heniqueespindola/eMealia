import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, PlataformaSaude } from '@emealia/types';

export async function updateHealthSyncPrefs(
  client: SupabaseClient<Database>,
  userId: string,
  updates: {
    sync_saude_activo?:     boolean;
    sync_saude_ultimo_em?:  string;
    sync_saude_plataforma?: PlataformaSaude | null;
  }
) {
  return client.from('profiles').update(updates).eq('id', userId).select().single();
}
