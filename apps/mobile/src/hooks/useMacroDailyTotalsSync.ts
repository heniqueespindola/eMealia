import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { upsertMacroDailyTotals } from '@emealia/supabase';
import { resolverMacrosPorDia } from '@/lib/macroResolution';
import { useRecipeMacros } from './useRecipeMacros';
import { dataDoSlot } from '@/constants/planner';
import type { MealPlanItem, SavedRecipe, MacroNutrients } from '@emealia/types';

export function useMacroDailyTotalsSync(
  userId: string | undefined,
  semanaInicio: string,
  items: MealPlanItem[],
  savedRecipes: SavedRecipe[],
  enabled: boolean
) {
  const { fetchMacros } = useRecipeMacros();
  const cacheRef = useRef<Map<string, MacroNutrients | null>>(new Map());

  useEffect(() => {
    if (!userId || !enabled) return;
    const uid = userId;
    let cancelado = false;

    async function sincronizar() {
      const porDia = await resolverMacrosPorDia(items, savedRecipes, fetchMacros, cacheRef.current);
      if (cancelado) return;

      const rows = Array.from({ length: 7 }, (_, dia) => {
        const dados = porDia[dia] ?? { totais: { calorias: 0, proteinas: 0, hidratos: 0, gorduras: 0 }, parcial: false };
        return {
          user_id:  uid,
          data:     dataDoSlot(semanaInicio, dia),
          calorias: dados.totais.calorias,
          proteinas: dados.totais.proteinas,
          hidratos: dados.totais.hidratos,
          gorduras: dados.totais.gorduras,
          parcial:  dados.parcial,
        };
      });

      const { error } = await upsertMacroDailyTotals(supabase!, rows);
      if (error) console.error('[useMacroDailyTotalsSync] upsertMacroDailyTotals falhou:', error);
    }

    sincronizar();
    return () => { cancelado = true; };
  }, [userId, semanaInicio, items, savedRecipes, enabled]);
}
