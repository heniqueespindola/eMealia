import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { PantryItem } from '@emealia/types';

export function usePantry(userId: string) {
  const [items, setItems]   = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('pantry_items')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      setItems(data ?? []);
      setLoading(false);
    }
    fetch();
  }, [userId]);

  async function add(item: Omit<PantryItem, 'id' | 'created_at'>) {
    const { data } = await supabase.from('pantry_items').insert(item).select().single();
    if (data) setItems((prev) => [data, ...prev]);
  }

  async function remove(id: string) {
    await supabase.from('pantry_items').delete().eq('id', id);
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return { items, loading, add, remove };
}
