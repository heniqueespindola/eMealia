import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getFollowedCreators, getCreatorsByIds, followCreator, unfollowCreator } from '@emealia/supabase';
import { useFollowedCreatorsStore } from '@/stores/followedCreatorsStore';
import type { Creator } from '@emealia/types';

export function useFollowedCreators(userId: string | undefined) {
  const items    = useFollowedCreatorsStore((s) => s.items);
  const creators = useFollowedCreatorsStore((s) => s.creators);
  const loading  = useFollowedCreatorsStore((s) => s.loading);

  useEffect(() => {
    if (!userId) { useFollowedCreatorsStore.getState().reset(); return; }
    if (useFollowedCreatorsStore.getState().loadedUserId === userId) return;
    fetchItems(userId);
  }, [userId]);

  async function fetchItems(uid: string) {
    useFollowedCreatorsStore.getState().setLoading(true);
    const { data: follows, error } = await getFollowedCreators(supabase!, uid);
    if (error) { console.error('[useFollowedCreators] getFollowedCreators falhou:', error); useFollowedCreatorsStore.getState().setItems(uid, [], []); return; }
    const { data: creatorsData } = await getCreatorsByIds(supabase!, (follows ?? []).map((f) => f.creator_id));
    useFollowedCreatorsStore.getState().setItems(uid, follows ?? [], creatorsData ?? []);
  }

  async function follow(creator: Creator) {
    if (!userId) return;
    const { data, error } = await followCreator(supabase!, userId, creator.id);
    if (error) { console.error('[useFollowedCreators] followCreator falhou:', error); return; }
    if (data) useFollowedCreatorsStore.getState().addFollow(data, creator);
  }

  async function unfollow(creatorId: string) {
    if (!userId) return;
    const { error } = await unfollowCreator(supabase!, userId, creatorId);
    if (error) { console.error('[useFollowedCreators] unfollowCreator falhou:', error); return; }
    useFollowedCreatorsStore.getState().removeFollow(creatorId);
  }

  function isFollowing(creatorId: string) {
    return items.some((f) => f.creator_id === creatorId);
  }

  return { items, creators, loading, follow, unfollow, isFollowing, channelIds: creators.map((c) => c.channel_id) };
}
