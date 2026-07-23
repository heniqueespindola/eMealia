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

    // Evita refetch desnecessário: se já temos o perfil deste utilizador em
    // memória (ex: acabado de atualizar no onboarding), não o substitui por
    // uma nova leitura — impede que uma montagem de ecrã (ex: (tabs)/index)
    // sobreponha um update otimista recém-feito com dados desatualizados.
    const current = useProfileStore.getState().profile;
    if (current && current.id === userId) {
      useProfileStore.getState().setLoading(false);
      return;
    }

    useProfileStore.getState().setLoading(true);
    getProfile(supabase!, userId).then(({ data, error }) => {
      if (error) {
        console.error('[useProfile] getProfile falhou:', error);
      }
      console.log('[useProfile] profile carregado:', JSON.stringify(data));
      useProfileStore.getState().setProfile(data ?? null);
      useProfileStore.getState().setLoading(false);
    });
  }, [userId]);

  return { profile, loading };
}
