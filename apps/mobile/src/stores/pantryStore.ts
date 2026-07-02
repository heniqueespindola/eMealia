import { create } from 'zustand';
import type { PantryItem } from '@emealia/types';

interface PantryState {
  items:     PantryItem[];
  setItems:  (items: PantryItem[]) => void;
  addItem:   (item: PantryItem) => void;
  removeItem:(id: string) => void;
}

export const usePantryStore = create<PantryState>((set) => ({
  items:      [],
  setItems:   (items) => set({ items }),
  addItem:    (item)  => set((s) => ({ items: [item, ...s.items] })),
  removeItem: (id)    => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
}));
