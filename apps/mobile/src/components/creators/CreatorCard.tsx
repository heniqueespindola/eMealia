import { View, Text, Image, Pressable } from 'react-native';
import { router } from 'expo-router';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { FollowButton } from './FollowButton';
import type { Creator } from '@emealia/types';

interface CreatorCardProps {
  creator:        Creator;
  following:      boolean;
  onToggleFollow: () => void;
}

export function CreatorCard({ creator, following, onToggleFollow }: CreatorCardProps) {
  return (
    <Pressable
      onPress={() => router.push(`/creators/${creator.id}`)}
      style={{
        flexDirection:   'row',
        alignItems:      'center',
        backgroundColor: colors.bgDarkAlt,
        borderRadius:    radius.lg,
        padding:         spacing.md,
        marginBottom:    spacing.md,
      }}
    >
      <Image
        source={{ uri: creator.avatar_url ?? undefined }}
        style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.border }}
      />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.textInverted }}>
          {creator.nome ?? creator.canal}
        </Text>
        {creator.especialidade && (
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {creator.especialidade}
          </Text>
        )}
        {creator.numero_videos != null && (
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
            {creator.numero_videos} vídeos
          </Text>
        )}
      </View>
      <FollowButton following={following} onPress={onToggleFollow} />
    </Pressable>
  );
}
