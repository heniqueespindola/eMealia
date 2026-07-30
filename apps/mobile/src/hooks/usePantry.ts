import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getPantry, addPantryItem, updatePantryItem, deletePantryItem } from '@emealia/supabase';
import { usePantryStore } from '@/stores/pantryStore';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import * as pantryCache from '@/lib/offline/pantryCache';
import type { PantryItem, Database } from '@emealia/types';

type PantryInsert = Database['public']['Tables']['pantry_items']['Insert'];

export function usePantry(userId: string | undefined) {
  const items   = usePantryStore((s) => s.items);
  const loading = usePantryStore((s) => s.loading);
  const { isOffline } = useNetworkStatus();

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

    if (isOffline) {
      const cached = await pantryCache.getCachedItems(uid);
      usePantryStore.getState().setItems(uid, cached);
      return;
    }

    const { data, error } = await getPantry(supabase!, uid);
    if (error) console.error('[usePantry] getPantry falhou:', error);
    const fetched = data ?? [];
    usePantryStore.getState().setItems(uid, fetched);
    await pantryCache.replaceCachedItems(uid, fetched);
  }

  async function add(item: Omit<PantryInsert, 'user_id'>) {
    if (!userId) return;

    if (isOffline) {
      const newItem = await pantryCache.addOffline(userId, item);
      usePantryStore.getState().addItem(newItem);
      return;
    }

    const { data, error } = await addPantryItem(supabase!, { ...item, user_id: userId });
    if (error) { console.error('[usePantry] addPantryItem falhou:', error); return; }
    if (data) {
      usePantryStore.getState().addItem(data);
      await pantryCache.upsertCachedItem(data);
    }
  }

  async function update(id: string, updates: Partial<PantryItem>) {
    if (isOffline) {
      const updated = await pantryCache.updateOffline(id, updates);
      if (updated) usePantryStore.getState().updateItem(updated);
      return;
    }

    const finalUpdates = 'expira_em' in updates
      ? { ...updates, alerta_validade_enviado_em: null }
      : updates;

    const { data, error } = await updatePantryItem(supabase!, id, finalUpdates);
    if (error) { console.error('[usePantry] updatePantryItem falhou:', error); return; }
    if (data) {
      usePantryStore.getState().updateItem(data);
      await pantryCache.upsertCachedItem(data);
    }
  }

  async function remove(id: string) {
    if (isOffline) {
      await pantryCache.removeOffline(id);
      usePantryStore.getState().removeItem(id);
      return;
    }

    const { error } = await deletePantryItem(supabase!, id);
    if (error) { console.error('[usePantry] deletePantryItem falhou:', error); return; }
    usePantryStore.getState().removeItem(id);
    await pantryCache.deleteCachedItem(id);
  }

  function refetch() {
    if (userId) fetchItems(userId);
  }

  return { items, loading, add, update, remove, refetch };
}
