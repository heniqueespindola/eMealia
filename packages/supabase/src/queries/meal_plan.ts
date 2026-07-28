import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@emealia/types';

type MealPlanInsert = Database['public']['Tables']['meal_plan']['Insert'];

export async function getMealPlanSemana(client: SupabaseClient<Database>, userId: string, semanaInicio: string) {
  return client
    .from('meal_plan')
    .select('*')
    .eq('user_id', userId)
    .eq('semana_inicio', semanaInicio)
    .order('dia_semana', { ascending: true });
}

export async function upsertMealPlanSlot(client: SupabaseClient<Database>, item: MealPlanInsert) {
  return client
    .from('meal_plan')
    .upsert(item, { onConflict: 'user_id,semana_inicio,dia_semana,momento' })
    .select()
    .single();
}

export async function deleteMealPlanSlot(client: SupabaseClient<Database>, id: string) {
  return client.from('meal_plan').delete().eq('id', id);
}
