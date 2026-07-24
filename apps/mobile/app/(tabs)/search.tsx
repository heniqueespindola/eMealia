import { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { usePantry } from '@/hooks/usePantry';
import { useRecipeSearch } from '@/hooks/useRecipeSearch';
import { useIngredientAutocomplete } from '@/hooks/useIngredientAutocomplete';
import { Input } from '@/components/ui/Input';
import { Pill } from '@/components/ui/Pill';
import { IngredientChip } from '@/components/pantry/IngredientChip';
import { IngredientAutocompleteList } from '@/components/pantry/IngredientAutocompleteList';
import { FilterRow } from '@/components/recipe/FilterRow';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { colors, fonts, spacing } from '@/constants/theme';
import { saveRecipe, unsaveRecipe, getSavedRecipes } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import type { RecipeSearchResult } from '@emealia/types';

export default function SearchScreen() {
  const { user } = useAuth();
  const { usarDespensa: usarDespensaParam } = useLocalSearchParams<{ usarDespensa?: string }>();
  const { items: pantryItems } = usePantry(user?.id);
  const { ingredients, filtros, results, loading, addIngredient, removeIngredient, toggleFiltro, usarDespensa } =
    useRecipeSearch();
  const [inputText, setInputText] = useState('');
  const [usandoDespensa, setUsandoDespensa] = useState(false);
  const suggestions = useIngredientAutocomplete(inputText);
  const [savedMap, setSavedMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user?.id) return;
    getSavedRecipes(supabase!, user.id).then(({ data }) => {
      setSavedMap(new Map((data ?? []).map((r) => [r.recipe_id, r.id])));
    });
  }, [user?.id]);

  useEffect(() => {
    if (usarDespensaParam === '1' && !usandoDespensa && pantryItems.length > 0) {
      setUsandoDespensa(true);
      usarDespensa(pantryItems);
    }
  }, [usarDespensaParam, usandoDespensa, pantryItems]);

  function handleSubmitIngredient() {
    if (inputText.trim()) {
      addIngredient(inputText.trim());
      setInputText('');
    }
  }

  function handleSelectSuggestion(nome: string) {
    addIngredient(nome);
    setInputText('');
  }

  function handleToggleDespensa() {
    setUsandoDespensa((prev) => {
      const next = !prev;
      if (next) usarDespensa(pantryItems);
      return next;
    });
  }

  async function handleToggleSave(recipe: RecipeSearchResult) {
    if (!user) return;
    const savedId = savedMap.get(recipe.id);
    if (savedId) {
      await unsaveRecipe(supabase!, savedId);
      setSavedMap((prev) => {
        const next = new Map(prev);
        next.delete(recipe.id);
        return next;
      });
    } else {
      const { data } = await saveRecipe(supabase!, {
        user_id:       user.id,
        recipe_id:     recipe.id,
        titulo:        recipe.titulo,
        fonte:         'spoonacular',
        thumbnail_url: recipe.thumbnail_url,
        source_url:    recipe.source_url,
        macros:        recipe.macros,
        filtros:       recipe.filtros,
        colecao:       'favoritos',
      });
      if (data) {
        setSavedMap((prev) => new Map(prev).set(recipe.id, data.id));
      }
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          Pesquisar por ingredientes
        </Text>

        <Input
          label="Adicionar ingrediente"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSubmitIngredient}
          placeholder="ex: ovo, tomate..."
        />

        {suggestions.length > 0 && (
          <IngredientAutocompleteList suggestions={suggestions} onSelect={handleSelectSuggestion} />
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
          {ingredients.map((ing) => (
            <IngredientChip key={ing} nome={ing} onRemove={() => removeIngredient(ing)} />
          ))}
        </View>
        <Pill label="Usar despensa" selected={usandoDespensa} onPress={handleToggleDespensa} />
        <FilterRow filtrosSelecionados={filtros} onToggle={toggleFiltro} />
      </View>

      {ingredients.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
            Adiciona pelo menos um ingrediente para veres receitas.
          </Text>
        </View>
      ) : loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : results.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
            Nenhuma receita encontrada com estes ingredientes/filtros.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: spacing.lg }}
          renderItem={({ item }) => (
            <RecipeCard
              recipe={item}
              saved={savedMap.has(item.id)}
              onToggleSave={() => handleToggleSave(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
