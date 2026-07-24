import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMealPlanSemana } from '@emealia/supabase';
import type { MealPlanItem } from '@emealia/types';

export function useMealPlanWeek(userId: string | undefined) {
  const [loading, setLoading] = useState(false);

  async function fetchSemana(semanaInicio: string): Promise<MealPlanItem[]> {
    if (!userId) return [];
    setLoading(true);
    const { data, error } = await getMealPlanSemana(supabase!, userId, semanaInicio);
    setLoading(false);
    if (error) { console.error('[useMealPlanWeek] getMealPlanSemana falhou:', error); return []; }
    return data ?? [];
  }

  return { fetchSemana, loading };
}
