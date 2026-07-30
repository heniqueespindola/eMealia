import { useState } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useRecipeSearch } from '@/hooks/useRecipeSearch';
import { Input } from '@/components/ui/Input';
import { Pill } from '@/components/ui/Pill';
import { IngredientChip } from '@/components/pantry/IngredientChip';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import type { PantryItem, RecipeSource } from '@emealia/types';

interface PlannerSearchTabProps {
  pantryItems: PantryItem[];
  onSelect:    (receita: { recipe_id: string; titulo: string; fonte: RecipeSource }) => void;
}

export function PlannerSearchTab({ pantryItems, onSelect }: PlannerSearchTabProps) {
  const { t } = useTranslation();
  const { ingredients, results, loading, addIngredient, removeIngredient, usarDespensa } = useRecipeSearch();
  const [inputText, setInputText] = useState('');
  const [usandoDespensa, setUsandoDespensa] = useState(false);

  function handleSubmitIngredient() {
    if (inputText.trim()) {
      addIngredient(inputText.trim());
      setInputText('');
    }
  }

  function handleToggleDespensa() {
    setUsandoDespensa((prev) => {
      const next = !prev;
      if (next) usarDespensa(pantryItems);
      return next;
    });
  }

  return (
    <View style={{ flex: 1 }}>
      <Input
        label={t('search.adicionarIngrediente')}
        value={inputText}
        onChangeText={setInputText}
        onSubmitEditing={handleSubmitIngredient}
        placeholder={t('search.placeholderIngrediente')}
      />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {ingredients.map((ing) => (
          <IngredientChip key={ing} nome={ing} onRemove={() => removeIngredient(ing)} />
        ))}
      </View>

      <Pill label={t('search.usarDespensa')} selected={usandoDespensa} onPress={handleToggleDespensa} />

      {loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
              <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
                {t('search.semIngredientes')}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect({ recipe_id: item.id, titulo: item.titulo, fonte: 'spoonacular' })}
              style={{ paddingVertical: spacing.sm }}
            >
              <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted }}>
                {item.titulo}
              </Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
