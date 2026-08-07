import { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, ActivityIndicator, Pressable, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useFollowedCreators } from '@/hooks/useFollowedCreators';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useFeed } from '@/hooks/useFeed';
import { FollowButton } from '@/components/creators/FollowButton';
import { VideoPlayerModal } from '@/components/feed/VideoPlayerModal';
import { SourceIcon } from '@/components/feed/SourceIcon';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { getCreatorById } from '@emealia/supabase';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Creator, VideoItem } from '@emealia/types';

export default function CreatorProfileScreen() {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [videoSelecionado, setVideoSelecionado] = useState<VideoItem | null>(null);
  const { isFollowing, follow, unfollow } = useFollowedCreators(user?.id);
  const { registerForPush } = usePushNotifications();

  // Grelha estilo Instagram: 3 colunas, quadradas, com um espaçamento
  // fino de 2px entre elas (nada de paddingHorizontal aqui — as colunas
  // vão de ponta a ponta do ecrã).
  const GRID_GAP = 2;
  const ITEM_SIZE = (width - GRID_GAP * 2) / 3;

  useEffect(() => {
    if (!id) return;
    getCreatorById(supabase!, id).then(({ data }) => setCreator(data ?? null));
  }, [id]);

  const { videos, loading } = useFeed(undefined, [], creator ? [creator.channel_id] : undefined);

  async function handleToggleFollow() {
    if (!user?.id || !creator) return;
    if (isFollowing(creator.id)) unfollow(creator.id);
    else { follow(creator); registerForPush(user.id); }
  }

  if (!creator) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: spacing.xs, alignSelf: 'flex-start', marginLeft: -spacing.xs }}>
            <Ionicons name="chevron-back" size={26} color={colors.textInverted} />
          </Pressable>
        </View>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: spacing.xs, alignSelf: 'flex-start', marginLeft: -spacing.xs }}>
          <Ionicons name="chevron-back" size={26} color={colors.textInverted} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(v) => v.id}
          numColumns={3}
          columnWrapperStyle={{ gap: GRID_GAP }}
          contentContainerStyle={{ gap: GRID_GAP, paddingBottom: spacing.lg }}
          ListHeaderComponent={
            <View style={{ padding: spacing.lg, paddingTop: spacing.xs, alignItems: 'center' }}>
              <Image
                source={{ uri: creator.avatar_url ?? undefined }}
                style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: colors.border }}
              />
              <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.primary, marginTop: spacing.sm }}>
                {creator.nome ?? creator.canal}
              </Text>
              {creator.especialidade && (
                <Text style={{ fontFamily: fonts.regular, color: colors.textMuted }}>{creator.especialidade}</Text>
              )}
              <View style={{ marginTop: spacing.sm, marginBottom: spacing.md }}>
                <FollowButton following={isFollowing(creator.id)} onPress={handleToggleFollow} />
              </View>
              <Text
                style={{
                  fontFamily: fonts.semibold,
                  fontSize: 16,
                  color: colors.textInverted,
                  alignSelf: 'flex-start',
                  marginBottom: spacing.sm,
                }}
              >
                {t('creators.videosRecentes')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable onPress={() => setVideoSelecionado(item)} style={{ width: ITEM_SIZE, height: ITEM_SIZE }}>
              <Image
                source={{ uri: item.thumbnail_url }}
                style={{ width: '100%', height: '100%' }}
              />
              <View style={{ position: 'absolute', top: 4, left: 4 }}>
                <SourceIcon fonte={item.fonte ?? 'youtube'} />
              </View>
            </Pressable>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, fontFamily: fonts.regular, paddingHorizontal: spacing.lg }}>
              {t('creators.semVideos')}
            </Text>
          }
        />
      )}

      <VideoPlayerModal
        visible={!!videoSelecionado}
        video={videoSelecionado}
        onClose={() => setVideoSelecionado(null)}
      />
    </SafeAreaView>
  );
}
