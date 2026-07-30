import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@emealia/types';

type MacroDailyTotalInsert = Database['public']['Tables']['macro_daily_totals']['Insert'];

export async function getMacroDailyTotals(
  client: SupabaseClient<Database>,
  userId: string,
  dataInicio: string,
  dataFim: string
) {
  return client
    .from('macro_daily_totals')
    .select('*')
    .eq('user_id', userId)
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: true });
}

export async function upsertMacroDailyTotals(
  client: SupabaseClient<Database>,
  rows: MacroDailyTotalInsert[]
) {
  return client.from('macro_daily_totals').upsert(rows, { onConflict: 'user_id,data' }).select();
}
