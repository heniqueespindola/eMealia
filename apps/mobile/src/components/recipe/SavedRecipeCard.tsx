import { View, Text, Image, Pressable } from 'react-native';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { SourceBadge } from '@/components/feed/SourceBadge';
import type { SavedRecipe } from '@emealia/types';

interface SavedRecipeCardProps {
  recipe:      SavedRecipe;
  onPress:     () => void;
  onLongPress: () => void;
}

export function SavedRecipeCard({ recipe, onPress, onLongPress }: SavedRecipeCardProps) {
  const { t } = useTranslation();
  const metadata = [
    recipe.tempo_minutos != null ? `${recipe.tempo_minutos} min` : null,
    recipe.macros ? `${recipe.macros.calorias} kcal` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress}>
      <View
        style={{
          flexDirection:   'row',
          backgroundColor: colors.bgDarkAlt,
          borderRadius:    radius.lg,
          marginBottom:    spacing.md,
          overflow:        'hidden',
        }}
      >
        <View>
          <Image
            source={{ uri: recipe.thumbnail_url ?? undefined }}
            resizeMode="cover"
            style={{ width: 96, height: 96 }}
          />
          <View style={{ position: 'absolute', top: 6, left: 6 }}>
            <SourceBadge fonte={recipe.fonte} />
          </View>
        </View>

        <View style={{ flex: 1, padding: spacing.sm }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.textInverted }} numberOfLines={2}>
            {recipe.titulo}
          </Text>
          {metadata ? (
            <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              {metadata}
            </Text>
          ) : null}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
            {recipe.filtros.map((f) => (
              <View
                key={f}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius:    radius.full,
                  paddingHorizontal: 8,
                  paddingVertical:   2,
                  marginRight:       6,
                  marginBottom:      4,
                }}
              >
                <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: colors.primaryDark }}>
                  {t(`config.filtros.${f}`)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Pressable>
  );
}
