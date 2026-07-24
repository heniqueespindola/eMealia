import { create } from 'zustand';
import type { SavedRecipe } from '@emealia/types';

interface SavedRecipesState {
  items:            SavedRecipe[];
  loading:          boolean;
  loadedUserId:     string | null;
  customColecoes:   string[];       // coleções criadas nesta sessão, ainda sem receitas
  setItems:         (userId: string, items: SavedRecipe[]) => void;
  setLoading:       (loading: boolean) => void;
  addItem:          (item: SavedRecipe) => void;
  updateItem:       (item: SavedRecipe) => void;
  removeItem:       (id: string) => void;
  addCustomColecao: (nome: string) => void;
  removeCustomColecao: (nome: string) => void;
  reset:            () => void;
}

export const useSavedRecipesStore = create<SavedRecipesState>((set) => ({
  items:            [],
  loading:          true,
  loadedUserId:     null,
  customColecoes:   [],
  setItems:         (userId, items) => set({ items, loadedUserId: userId, loading: false }),
  setLoading:       (loading) => set({ loading }),
  addItem:          (item) => set((s) => ({ items: [item, ...s.items] })),
  updateItem:       (item) => set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) })),
  removeItem:       (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  addCustomColecao: (nome) => set((s) => (s.customColecoes.includes(nome) ? s : { customColecoes: [...s.customColecoes, nome] })),
  removeCustomColecao: (nome) => set((s) => ({ customColecoes: s.customColecoes.filter((c) => c !== nome) })),
  reset:            () => set({ items: [], loadedUserId: null, loading: false, customColecoes: [] }),
}));
