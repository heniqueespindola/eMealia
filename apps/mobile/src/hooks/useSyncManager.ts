import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { processOutbox } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import { sqliteAdapter } from '@/lib/offline/sqliteAdapter';
import { usePantryStore } from '@/stores/pantryStore';
import { getCachedItems } from '@/lib/offline/pantryCache';

export function useSyncManager(userId: string | undefined) {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!userId || !supabase) return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && !syncingRef.current) {
        syncingRef.current = true;
        processOutbox(sqliteAdapter, supabase!)
          .then(() => getCachedItems(userId))
          .then((items) => usePantryStore.getState().setItems(userId, items))
          .finally(() => { syncingRef.current = false; });
      }
    });
    return unsubscribe;
  }, [userId]);
}
