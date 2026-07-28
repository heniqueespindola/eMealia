import { useEffect, useRef, useState } from 'react';
import { useRecipeMacros } from './useRecipeMacros';
import type { MealPlanItem, SavedRecipe, MacroNutrients } from '@emealia/types';

interface DiaMacros {
  totais:  MacroNutrients;
  parcial: boolean;
}

const VAZIO: MacroNutrients = { calorias: 0, proteinas: 0, hidratos: 0, gorduras: 0 };

export function usePlannerMacros(items: MealPlanItem[], savedRecipes: SavedRecipe[]) {
  const { fetchMacros } = useRecipeMacros();
  const [macrosByDia, setMacrosByDia] = useState<Record<number, DiaMacros>>({});
  const cacheRef = useRef<Map<string, MacroNutrients | null>>(new Map());

  useEffect(() => {
    let cancelado = false;

    async function calcular() {
      const savedMap = new Map(savedRecipes.map((r) => [r.recipe_id, r.macros]));
      const porDia: Record<number, DiaMacros> = {};

      for (const item of items) {
        if (!item.recipe_id) continue;
        let macros: MacroNutrients | null = savedMap.get(item.recipe_id) ?? null;

        if (!macros && item.fonte === 'spoonacular') {
          if (cacheRef.current.has(item.recipe_id)) {
            macros = cacheRef.current.get(item.recipe_id)!;
          } else {
            macros = await fetchMacros(item.recipe_id);
            cacheRef.current.set(item.recipe_id, macros);
          }
        }

        const atual = porDia[item.dia_semana] ?? { totais: { ...VAZIO }, parcial: false };
        if (macros) {
          atual.totais = {
            calorias:  atual.totais.calorias  + macros.calorias,
            proteinas: atual.totais.proteinas + macros.proteinas,
            hidratos:  atual.totais.hidratos  + macros.hidratos,
            gorduras:  atual.totais.gorduras  + macros.gorduras,
          };
        } else {
          atual.parcial = true;
        }
        porDia[item.dia_semana] = atual;
      }

      if (!cancelado) setMacrosByDia(porDia);
    }

    calcular();
    return () => { cancelado = true; };
  }, [items, savedRecipes]);

  return { macrosByDia };
}
