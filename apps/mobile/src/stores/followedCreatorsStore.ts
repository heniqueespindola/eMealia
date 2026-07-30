import { create } from 'zustand';
import type { FollowedCreator, Creator } from '@emealia/types';

interface FollowedCreatorsState {
  items:        FollowedCreator[];
  creators:     Creator[];
  loading:      boolean;
  loadedUserId: string | null;
  setItems:     (userId: string, items: FollowedCreator[], creators: Creator[]) => void;
  setLoading:   (loading: boolean) => void;
  addFollow:    (item: FollowedCreator, creator: Creator) => void;
  removeFollow: (creatorId: string) => void;
  reset:        () => void;
}

export const useFollowedCreatorsStore = create<FollowedCreatorsState>((set) => ({
  items:        [],
  creators:     [],
  loading:      true,
  loadedUserId: null,
  setItems:     (userId, items, creators) => set({ items, creators, loadedUserId: userId, loading: false }),
  setLoading:   (loading) => set({ loading }),
  addFollow:    (item, creator) => set((s) => ({ items: [item, ...s.items], creators: [creator, ...s.creators] })),
  removeFollow: (creatorId) => set((s) => ({
    items:    s.items.filter((i) => i.creator_id !== creatorId),
    creators: s.creators.filter((c) => c.id !== creatorId),
  })),
  reset: () => set({ items: [], creators: [], loadedUserId: null, loading: false }),
}));
