import { View, Text, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
  const { creators, loading, error } = useFeaturedCreators();
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
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: spacing.xs, alignSelf: 'flex-start', marginLeft: -spacing.xs }}>
          <Ionicons name="chevron-back" size={26} color={colors.textInverted} />
        </Pressable>
      </View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.xs }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          {t('creators.titulo')}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.xxl }}>
          <Text style={{ fontFamily: fonts.medium, color: colors.primaryDark, textAlign: 'center', marginBottom: spacing.xs }}>
            {t('creators.erroTitulo')}
          </Text>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
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
