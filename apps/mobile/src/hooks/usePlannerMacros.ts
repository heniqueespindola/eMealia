import { useEffect, useRef, useState } from 'react';
import { useRecipeMacros } from './useRecipeMacros';
import { resolverMacrosPorDia, type DiaMacros } from '@/lib/macroResolution';
import type { MealPlanItem, SavedRecipe, MacroNutrients } from '@emealia/types';

export function usePlannerMacros(items: MealPlanItem[], savedRecipes: SavedRecipe[]) {
  const { fetchMacros } = useRecipeMacros();
  const [macrosByDia, setMacrosByDia] = useState<Record<number, DiaMacros>>({});
  const cacheRef = useRef<Map<string, MacroNutrients | null>>(new Map());

  useEffect(() => {
    let cancelado = false;
    resolverMacrosPorDia(items, savedRecipes, fetchMacros, cacheRef.current).then((porDia) => {
      if (!cancelado) setMacrosByDia(porDia);
    });
    return () => { cancelado = true; };
  }, [items, savedRecipes]);

  return { macrosByDia };
}
