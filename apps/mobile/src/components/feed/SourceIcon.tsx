import { View } from 'react-native';
import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
import type { RecipeSource } from '@emealia/types';

interface SourceIconProps {
  fonte: RecipeSource;
  size?: number;
}

type IoniconName = ComponentProps<typeof Ionicons>['name'];

// Versão só com ícone do SourceBadge — usada onde o espaço é pequeno
// demais para o nome da plataforma (ex: grelha de vídeos do criador).
const ICONS: Record<RecipeSource, IoniconName> = {
  youtube:     'logo-youtube',
  tiktok:      'logo-tiktok',
  instagram:   'logo-instagram',
  emealia:     'restaurant',
  spoonacular: 'restaurant',
  blog:        'document-text',
};

// Mesmas cores de marca do SourceBadge (constants/theme.ts).
const BACKGROUND: Record<RecipeSource, string> = {
  youtube:     colors.youtube,
  tiktok:      colors.tiktok,
  instagram:   colors.instagram,
  emealia:     colors.emealia,
  spoonacular: colors.emealia,
  blog:        colors.emealia,
};

const TEXTO_ESCURO: RecipeSource[] = ['emealia', 'spoonacular', 'blog'];

export function SourceIcon({ fonte, size = 11 }: SourceIconProps) {
  return (
    <View
      style={{
        width: size + 8,
        height: size + 8,
        borderRadius: (size + 8) / 2,
        backgroundColor: BACKGROUND[fonte],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons
        name={ICONS[fonte]}
        size={size}
        color={TEXTO_ESCURO.includes(fonte) ? colors.primaryDark : colors.textInverted}
      />
    </View>
  );
}
