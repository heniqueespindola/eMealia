import { View, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import type { RecipeSource } from '@emealia/types';

interface SourceBadgeProps {
  fonte: RecipeSource;
}

const LABELS: Record<RecipeSource, string> = {
  youtube:     'YouTube',
  tiktok:      'TikTok',
  instagram:   'Instagram',
  emealia:     'eMealia',
  spoonacular: 'Spoonacular',
  blog:        'Blog',
};

const BACKGROUND: Record<RecipeSource, string> = {
  youtube:     colors.youtube,
  tiktok:      colors.tiktok,
  instagram:   colors.instagram,
  emealia:     colors.emealia,
  spoonacular: colors.emealia,
  blog:        colors.emealia,
};

const TEXTO_ESCURO: RecipeSource[] = ['emealia', 'spoonacular', 'blog'];

export function SourceBadge({ fonte }: SourceBadgeProps) {
  return (
    <View
      style={{
        backgroundColor: BACKGROUND[fonte],
        borderRadius:    radius.sm,
        paddingHorizontal: 8,
        paddingVertical:   4,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.medium,
          fontSize:   11,
          color:      TEXTO_ESCURO.includes(fonte) ? colors.primaryDark : colors.textInverted,
        }}
      >
        {LABELS[fonte]}
      </Text>
    </View>
  );
}
