import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getPantry, addPantryItem, updatePantryItem, deletePantryItem } from '@emealia/supabase';
import { usePantryStore } from '@/stores/pantryStore';
import type { PantryItem, Database } from '@emealia/types';

type PantryInsert = Database['public']['Tables']['pantry_items']['Insert'];

export function usePantry(userId: string | undefined) {
  const items   = usePantryStore((s) => s.items);
  const loading = usePantryStore((s) => s.loading);

  useEffect(() => {
    if (!userId) {
      usePantryStore.getState().reset();
      return;
    }
    if (usePantryStore.getState().loadedUserId === userId) return;
    fetchItems(userId);
  }, [userId]);

  async function fetchItems(uid: string) {
    usePantryStore.getState().setLoading(true);
    const { data, error } = await getPantry(supabase!, uid);
    if (error) console.error('[usePantry] getPantry falhou:', error);
    usePantryStore.getState().setItems(uid, data ?? []);
  }

  async function add(item: Omit<PantryInsert, 'user_id'>) {
    if (!userId) return;
    const { data, error } = await addPantryItem(supabase!, { ...item, user_id: userId });
    if (error) { console.error('[usePantry] addPantryItem falhou:', error); return; }
    if (data) usePantryStore.getState().addItem(data);
  }

  async function update(id: string, updates: Partial<PantryItem>) {
    const { data, error } = await updatePantryItem(supabase!, id, updates);
    if (error) { console.error('[usePantry] updatePantryItem falhou:', error); return; }
    if (data) usePantryStore.getState().updateItem(data);
  }

  async function remove(id: string) {
    const { error } = await deletePantryItem(supabase!, id);
    if (error) { console.error('[usePantry] deletePantryItem falhou:', error); return; }
    usePantryStore.getState().removeItem(id);
  }

  function refetch() {
    if (userId) fetchItems(userId);
  }

  return { items, loading, add, update, remove, refetch };
}
