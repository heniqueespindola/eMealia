import { create } from 'zustand';
import type { Profile } from '@emealia/types';

interface ProfileState {
  profile:    Profile | null;
  loading:    boolean;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  profile:    null,
  loading:    true,
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
}));
