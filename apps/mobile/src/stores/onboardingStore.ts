import { create } from 'zustand';
import type { FiltroDietetico } from '@emealia/types';

interface OnboardingState {
  filtrosDieteticos:    FiltroDietetico[];
  ingredientesIniciais: string[];
  filtrosFavoritos:     FiltroDietetico[];
  frequenciaCozinha:    number | null;
  setFiltrosDieteticos:    (filtros: FiltroDietetico[]) => void;
  setIngredientesIniciais: (ingredientes: string[]) => void;
  setFiltrosFavoritos:     (filtros: FiltroDietetico[]) => void;
  setFrequenciaCozinha:    (frequencia: number) => void;
  reset: () => void;
}

const initialState = {
  filtrosDieteticos:    [] as FiltroDietetico[],
  ingredientesIniciais: [] as string[],
  filtrosFavoritos:     [] as FiltroDietetico[],
  frequenciaCozinha:    null as number | null,
};

export const useOnboardingStore = create<OnboardingState>((set) => ({
  ...initialState,
  setFiltrosDieteticos:    (filtros)      => set({ filtrosDieteticos: filtros }),
  setIngredientesIniciais: (ingredientes) => set({ ingredientesIniciais: ingredientes }),
  setFiltrosFavoritos:     (filtros)      => set({ filtrosFavoritos: filtros }),
  setFrequenciaCozinha:    (frequencia)   => set({ frequenciaCozinha: frequencia }),
  reset:                   ()             => set(initialState),
}));
