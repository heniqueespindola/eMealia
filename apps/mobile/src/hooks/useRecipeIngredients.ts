import { useState } from 'react';
import { getSupabase } from '@/lib/supabase';

export function useRecipeIngredients() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  async function fetchIngredients(recipeId: string) {
    setLoading(true);
    setError(null);
    const { data, error } = await getSupabase().functions.invoke('recipe-ingredients', { body: { recipeId } });
    setLoading(false);
    if (error) { setError(error.message); return []; }
    return (data?.ingredientes ?? []) as { nome: string; quantidade: string | null }[];
  }

  return { fetchIngredients, loading, error };
}
