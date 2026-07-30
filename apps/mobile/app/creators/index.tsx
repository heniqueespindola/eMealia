import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useFeaturedCreators } from '@/hooks/useFeaturedCreators';
import { useFollowedCreators } from '@/hooks/useFollowedCreators';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { CreatorCard } from '@/components/creators/CreatorCard';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Creator } from '@emealia/types';

export default function CreatorsScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { creators, loading } = useFeaturedCreators();
  const { isFollowing, follow, unfollow } = useFollowedCreators(user?.id);
  const { registerForPush } = usePushNotifications();

  async function handleToggleFollow(creator: Creator) {
    if (!user?.id) return;
    if (isFollowing(creator.id)) {
      unfollow(creator.id);
    } else {
      follow(creator);
      registerForPush(user.id);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          {t('creators.titulo')}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={creators}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
          renderItem={({ item }) => (
            <CreatorCard creator={item} following={isFollowing(item.id)} onToggleFollow={() => handleToggleFollow(item)} />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl }}>
              <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
                {t('creators.semCriadores')}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
