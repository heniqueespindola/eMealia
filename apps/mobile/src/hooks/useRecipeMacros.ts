import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MacroNutrients } from '@emealia/types';

export function useRecipeMacros() {
  const [loading, setLoading] = useState(false);

  async function fetchMacros(recipeId: string): Promise<MacroNutrients | null> {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('recipe-ingredients', { body: { recipeId } });
    setLoading(false);
    if (error) { console.error('[useRecipeMacros] recipe-ingredients falhou:', error); return null; }
    return data?.macros ?? null;
  }

  return { fetchMacros, loading };
}
