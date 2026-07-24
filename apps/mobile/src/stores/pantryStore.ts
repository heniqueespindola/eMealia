import { create } from 'zustand';
import type { PantryItem } from '@emealia/types';

interface PantryState {
  items:        PantryItem[];
  loading:      boolean;
  loadedUserId: string | null;
  setItems:     (userId: string, items: PantryItem[]) => void;
  setLoading:   (loading: boolean) => void;
  addItem:      (item: PantryItem) => void;
  updateItem:   (item: PantryItem) => void;
  removeItem:   (id: string) => void;
  reset:        () => void;
}

export const usePantryStore = create<PantryState>((set) => ({
  items:        [],
  loading:      true,
  loadedUserId: null,
  setItems:     (userId, items) => set({ items, loadedUserId: userId, loading: false }),
  setLoading:   (loading) => set({ loading }),
  addItem:      (item)  => set((s) => ({ items: [item, ...s.items] })),
  updateItem:   (item)  => set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) })),
  removeItem:   (id)    => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  reset:        ()      => set({ items: [], loadedUserId: null, loading: false }),
}));
