import { useEffect, useState } from 'react';
import { View, Text, Image, FlatList, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useFollowedCreators } from '@/hooks/useFollowedCreators';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useFeed } from '@/hooks/useFeed';
import { FollowButton } from '@/components/creators/FollowButton';
import { useTranslation } from '@/hooks/useTranslation';
import { supabase } from '@/lib/supabase';
import { getCreatorById } from '@emealia/supabase';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Creator } from '@emealia/types';

export default function CreatorProfileScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const { isFollowing, follow, unfollow } = useFollowedCreators(user?.id);
  const { registerForPush } = usePushNotifications();

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
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ padding: spacing.lg, alignItems: 'center' }}>
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
        <View style={{ marginTop: spacing.sm }}>
          <FollowButton following={isFollowing(creator.id)} onPress={handleToggleFollow} />
        </View>
      </View>

      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.textInverted, paddingHorizontal: spacing.lg }}>
        {t('creators.videosRecentes')}
      </Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
      ) : (
        <FlatList
          data={videos}
          keyExtractor={(v) => v.id}
          horizontal
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => (
            <Image
              source={{ uri: item.thumbnail_url }}
              style={{ width: 140, height: 200, borderRadius: 12, marginRight: spacing.sm }}
            />
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, fontFamily: fonts.regular }}>{t('creators.semVideos')}</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
