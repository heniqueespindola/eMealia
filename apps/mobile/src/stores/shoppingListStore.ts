import { create } from 'zustand';
import type { ShoppingListItem } from '@emealia/types';

interface ShoppingListState {
  items:        ShoppingListItem[];
  loading:      boolean;
  loadedUserId: string | null;
  setItems:     (userId: string, items: ShoppingListItem[]) => void;
  setLoading:   (loading: boolean) => void;
  addItem:      (item: ShoppingListItem) => void;
  addItems:     (items: ShoppingListItem[]) => void;
  updateItem:   (item: ShoppingListItem) => void;
  removeItem:   (id: string) => void;
  clear:        () => void;
  reset:        () => void;
}

export const useShoppingListStore = create<ShoppingListState>((set) => ({
  items:        [],
  loading:      true,
  loadedUserId: null,
  setItems:     (userId, items) => set({ items, loadedUserId: userId, loading: false }),
  setLoading:   (loading) => set({ loading }),
  addItem:      (item)  => set((s) => ({ items: [item, ...s.items] })),
  addItems:     (items) => set((s) => ({ items: [...items, ...s.items] })),
  updateItem:   (item)  => set((s) => ({ items: s.items.map((i) => (i.id === item.id ? item : i)) })),
  removeItem:   (id)    => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  clear:        ()      => set({ items: [] }),
  reset:        ()      => set({ items: [], loadedUserId: null, loading: false }),
}));
