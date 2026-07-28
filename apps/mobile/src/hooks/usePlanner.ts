import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getMealPlanSemana, upsertMealPlanSlot, deleteMealPlanSlot } from '@emealia/supabase';
import { usePlannerStore } from '@/stores/plannerStore';
import type { MealPlanItem, Momento, RecipeSource } from '@emealia/types';

interface ReceitaParaSlot {
  recipe_id: string;
  titulo:    string;
  fonte:     RecipeSource;
}

export function usePlanner(userId: string | undefined, semanaInicio: string, enabled: boolean) {
  const items   = usePlannerStore((s) => s.items);
  const loading = usePlannerStore((s) => s.loading);

  useEffect(() => {
    if (!userId || !enabled) return;
    const key = `${userId}:${semanaInicio}`;
    if (usePlannerStore.getState().loadedKey === key) return;
    fetchSemana(key, userId, semanaInicio);
  }, [userId, semanaInicio, enabled]);

  async function fetchSemana(key: string, uid: string, semana: string) {
    usePlannerStore.getState().setLoading(true);
    const { data, error } = await getMealPlanSemana(supabase!, uid, semana);
    if (error) console.error('[usePlanner] getMealPlanSemana falhou:', error);
    usePlannerStore.getState().setItems(key, data ?? []);
  }

  async function assignSlot(diaSemana: number, momento: Momento, receita: ReceitaParaSlot) {
    if (!userId) return;
    const { data, error } = await upsertMealPlanSlot(supabase!, {
      user_id: userId, semana_inicio: semanaInicio, dia_semana: diaSemana, momento,
      recipe_id: receita.recipe_id, titulo: receita.titulo, fonte: receita.fonte,
    });
    if (error) { console.error('[usePlanner] upsertMealPlanSlot falhou:', error); return; }
    if (data) usePlannerStore.getState().upsertItem(data);
  }

  async function moveSlot(item: MealPlanItem, novoDia: number, novoMomento: Momento) {
    if (!item.recipe_id || !item.titulo || !item.fonte) return;
    const { error } = await deleteMealPlanSlot(supabase!, item.id);
    if (error) { console.error('[usePlanner] deleteMealPlanSlot falhou:', error); return; }
    usePlannerStore.getState().removeItem(item.id);
    await assignSlot(novoDia, novoMomento, { recipe_id: item.recipe_id, titulo: item.titulo, fonte: item.fonte });
  }

  async function removeSlot(id: string) {
    const { error } = await deleteMealPlanSlot(supabase!, id);
    if (error) { console.error('[usePlanner] deleteMealPlanSlot falhou:', error); return; }
    usePlannerStore.getState().removeItem(id);
  }

  return { items, loading, assignSlot, moveSlot, removeSlot };
}
