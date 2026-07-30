import { View, Text, Pressable, FlatList } from 'react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import type { SavedRecipe, RecipeSource } from '@emealia/types';

interface PlannerFavoritosTabProps {
  favoritos: SavedRecipe[];
  onSelect:  (receita: { recipe_id: string; titulo: string; fonte: RecipeSource }) => void;
}

export function PlannerFavoritosTab({ favoritos, onSelect }: PlannerFavoritosTabProps) {
  const { t } = useTranslation();
  return (
    <FlatList
      data={favoritos}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ flexGrow: 1 }}
      ListEmptyComponent={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
            {t('planner.semFavoritos')}
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onSelect({ recipe_id: item.recipe_id, titulo: item.titulo, fonte: item.fonte })}
          style={{ paddingVertical: spacing.sm }}
        >
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted }}>
            {item.titulo}
          </Text>
        </Pressable>
      )}
    />
  );
}
