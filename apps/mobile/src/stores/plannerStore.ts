import { create } from 'zustand';
import type { MealPlanItem } from '@emealia/types';

interface PlannerState {
  items:      MealPlanItem[];
  loading:    boolean;
  loadedKey:  string | null; // `${userId}:${semanaInicio}`
  setItems:   (key: string, items: MealPlanItem[]) => void;
  setLoading: (loading: boolean) => void;
  upsertItem: (item: MealPlanItem) => void;
  removeItem: (id: string) => void;
  reset:      () => void;
}

export const usePlannerStore = create<PlannerState>((set) => ({
  items:      [],
  loading:    true,
  loadedKey:  null,
  setItems:   (loadedKey, items) => set({ items, loadedKey, loading: false }),
  setLoading: (loading) => set({ loading }),
  upsertItem: (item) =>
    set((s) => ({
      items: [...s.items.filter((i) => !(i.dia_semana === item.dia_semana && i.momento === item.momento)), item],
    })),
  removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  reset:      () => set({ items: [], loadedKey: null, loading: false }),
}));
