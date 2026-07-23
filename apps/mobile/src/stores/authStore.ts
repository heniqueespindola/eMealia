import { create } from 'zustand';
import type { Session, User } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  user:    User | null;
  loading: boolean;
  plan:    'free' | 'premium_monthly' | 'premium_annual';
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setPlan:    (plan: AuthState['plan']) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user:    null,
  loading: true,
  plan:    'free',
  setSession: (session) => set({ session, user: session?.user ?? null }),
  setLoading: (loading) => set({ loading }),
  setPlan:    (plan) => set({ plan }),
}));
