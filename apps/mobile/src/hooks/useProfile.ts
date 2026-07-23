import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getProfile } from '@emealia/supabase';
import { useProfileStore } from '@/stores/profileStore';

export function useProfile(userId: string | undefined) {
  const profile = useProfileStore((s) => s.profile);
  const loading = useProfileStore((s) => s.loading);

  useEffect(() => {
    if (!userId) {
      useProfileStore.getState().setProfile(null);
      useProfileStore.getState().setLoading(false);
      return;
    }
    useProfileStore.getState().setLoading(true);
    getProfile(supabase!, userId).then(({ data }) => {
      useProfileStore.getState().setProfile(data ?? null);
      useProfileStore.getState().setLoading(false);
    });
  }, [userId]);

  return { profile, loading };
}
