import { View, Text, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { FILTROS_DIETETICOS } from '@emealia/config';
import type { RecipeSearchResult } from '@emealia/types';

interface RecipeCardProps {
  recipe:       RecipeSearchResult;
  saved:        boolean;
  onToggleSave: () => void;
}

export function RecipeCard({ recipe, saved, onToggleSave }: RecipeCardProps) {
  const metadata = [
    recipe.tempo_minutos != null ? `${recipe.tempo_minutos} min` : null,
    recipe.macros ? `${recipe.macros.calorias} kcal` : null,
    `${recipe.ingredientes_usados.length}/${recipe.total_ingredientes} disponíveis`,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View
      style={{
        flexDirection:   'row',
        backgroundColor: colors.bgDarkAlt,
        borderRadius:    radius.lg,
        marginBottom:    spacing.md,
        overflow:        'hidden',
      }}
    >
      <Image source={{ uri: recipe.thumbnail_url }} resizeMode="cover" style={{ width: 96, height: 96 }} />

      <View style={{ flex: 1, padding: spacing.sm }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.textInverted }} numberOfLines={2}>
          {recipe.titulo}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
          {metadata}
        </Text>
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
                {FILTROS_DIETETICOS.find((opt) => opt.value === f)?.label}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <Pressable onPress={onToggleSave} style={{ padding: spacing.sm, justifyContent: 'center' }}>
        <Ionicons name={saved ? 'heart' : 'heart-outline'} size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}
