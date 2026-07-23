import { View, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import type { VideoSource } from '@emealia/types';

interface SourceBadgeProps {
  fonte: VideoSource;
}

const LABELS: Record<VideoSource, string> = {
  youtube:   'YouTube',
  tiktok:    'TikTok',
  instagram: 'Instagram',
  emealia:   'eMealia',
};

export function SourceBadge({ fonte }: SourceBadgeProps) {
  return (
    <View
      style={{
        backgroundColor: colors[fonte],
        borderRadius:    radius.sm,
        paddingHorizontal: 8,
        paddingVertical:   4,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.medium,
          fontSize:   11,
          color:      fonte === 'emealia' ? colors.primaryDark : colors.textInverted,
        }}
      >
        {LABELS[fonte]}
      </Text>
    </View>
  );
}
