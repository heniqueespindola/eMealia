import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@emealia/types';

export async function getMealPlanSemana(client: SupabaseClient<Database>, userId: string, semanaInicio: string) {
  return client
    .from('meal_plan')
    .select('*')
    .eq('user_id', userId)
    .eq('semana_inicio', semanaInicio)
    .order('dia_semana', { ascending: true });
}
