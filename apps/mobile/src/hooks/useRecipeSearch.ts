import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import type { FiltroDietetico, PantryItem, RecipeSearchResult } from '@emealia/types';

export function useRecipeSearch() {
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [filtros, setFiltros]         = useState<FiltroDietetico[]>([]);
  const [results, setResults]         = useState<RecipeSearchResult[]>([]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const { isOffline }                 = useNetworkStatus();

  useEffect(() => {
    if (ingredients.length === 0) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (isOffline) {
      setResults([]);
      setError('Sem ligação à internet — a pesquisa de receitas precisa de rede.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke('search-recipes', {
        body: { ingredients, filtros, number: 10 },
      });
      setResults(data?.results ?? []);
      setError(error?.message ?? null);
      setLoading(false);
    }, 500);

    return () => clearTimeout(timeout);
  }, [ingredients.join(','), filtros.join(',')]);

  function addIngredient(nome: string) {
    const trimmed = nome.trim();
    if (!trimmed) return;
    setIngredients((prev) =>
      prev.some((i) => i.toLowerCase() === trimmed.toLowerCase()) ? prev : [...prev, trimmed]
    );
  }

  function removeIngredient(nome: string) {
    setIngredients((prev) => prev.filter((i) => i !== nome));
  }

  function toggleFiltro(f: FiltroDietetico) {
    setFiltros((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function usarDespensa(pantryItems: PantryItem[]) {
    setIngredients((prev) => {
      const next = [...prev];
      for (const item of pantryItems) {
        if (!next.some((i) => i.toLowerCase() === item.nome.toLowerCase())) {
          next.push(item.nome);
        }
      }
      return next;
    });
  }

  return { ingredients, filtros, results, loading, error, addIngredient, removeIngredient, toggleFiltro, usarDespensa };
}
