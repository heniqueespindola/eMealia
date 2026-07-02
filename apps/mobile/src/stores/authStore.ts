import { create } from 'zustand';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user:    User | null;
  plan:    'free' | 'premium_monthly' | 'premium_annual';
  setUser: (user: User | null) => void;
  setPlan: (plan: AuthState['plan']) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user:    null,
  plan:    'free',
  setUser: (user) => set({ user }),
  setPlan: (plan) => set({ plan }),
}));
