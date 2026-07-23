import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// Subscrição única (singleton) ao supabase.auth: useAuth() é chamado em
// vários layouts (root, (auth), onboarding, (tabs)), e cada chamada criava
// antes a sua PRÓPRIA subscrição + estado local via useState. Isso causava
// uma corrida entre instâncias (session a oscilar), limpando o profile
// repetidamente e disparando um ciclo infinito de fetches/re-renders. Agora
// só há UMA subscrição, escrevendo para a authStore partilhada; os
// consumidores apenas leem dela de forma reativa.
let authListenerInitialized = false;

function ensureAuthListener() {
  if (authListenerInitialized) return;
  authListenerInitialized = true;

  supabase.auth.getSession().then(({ data: { session } }) => {
    useAuthStore.getState().setSession(session);
    useAuthStore.getState().setLoading(false);
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    useAuthStore.getState().setSession(session);
  });
}

export function useAuth() {
  useEffect(() => {
    ensureAuthListener();
  }, []);

  const session = useAuthStore((s) => s.session);
  const loading = useAuthStore((s) => s.loading);
  const user    = useAuthStore((s) => s.user);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data; // { user, session }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { session, loading, user, signIn, signUp, signOut };
}
