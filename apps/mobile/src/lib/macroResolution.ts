import type { MealPlanItem, SavedRecipe, MacroNutrients } from '@emealia/types';

export interface DiaMacros {
  totais:  MacroNutrients;
  parcial: boolean;
}

const VAZIO: MacroNutrients = { calorias: 0, proteinas: 0, hidratos: 0, gorduras: 0 };

export async function resolverMacrosPorDia(
  items: MealPlanItem[],
  savedRecipes: SavedRecipe[],
  fetchMacros: (recipeId: string) => Promise<MacroNutrients | null>,
  cache: Map<string, MacroNutrients | null>
): Promise<Record<number, DiaMacros>> {
  const savedMap = new Map(savedRecipes.map((r) => [r.recipe_id, r.macros]));
  const porDia: Record<number, DiaMacros> = {};

  for (const item of items) {
    if (!item.recipe_id) continue;
    let macros: MacroNutrients | null = savedMap.get(item.recipe_id) ?? null;

    if (!macros && item.fonte === 'spoonacular') {
      if (cache.has(item.recipe_id)) {
        macros = cache.get(item.recipe_id)!;
      } else {
        macros = await fetchMacros(item.recipe_id);
        cache.set(item.recipe_id, macros);
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

  return porDia;
}
