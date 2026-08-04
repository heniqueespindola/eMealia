import { useEffect, useState } from 'react';
import { getSupabase } from '@/lib/supabase';

export function useIngredientAutocomplete(query: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const { data } = await getSupabase().functions.invoke('autocomplete-ingredients', {
        body: { query: query.trim() },
      });
      setSuggestions(data?.suggestions ?? []);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  return suggestions;
}
