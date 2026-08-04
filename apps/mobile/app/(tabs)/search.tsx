import { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePantry } from '@/hooks/usePantry';
import { useRecipeSearch } from '@/hooks/useRecipeSearch';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import { useIngredientAutocomplete } from '@/hooks/useIngredientAutocomplete';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useRecipeIngredients } from '@/hooks/useRecipeIngredients';
import { Input } from '@/components/ui/Input';
import { Pill } from '@/components/ui/Pill';
import { PremiumLock } from '@/components/paywall/PremiumLock';
import { IngredientChip } from '@/components/pantry/IngredientChip';
import { IngredientAutocompleteList } from '@/components/pantry/IngredientAutocompleteList';
import { FilterRow } from '@/components/recipe/FilterRow';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { RecipeDetailModal } from '@/components/recipe/RecipeDetailModal';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import { LIMITS } from '@emealia/config';
import type { RecipeSearchResult, SavedRecipe } from '@emealia/types';

// O RecipeDetailModal foi construído para o formato SavedRecipe (usado em
// Favoritos). Os resultados da pesquisa são todos da Spoonacular e ainda
// não estão guardados, por isso adaptamos aqui em vez de reescrever o modal.
function toDetailRecipe(r: RecipeSearchResult): SavedRecipe {
  return {
    id: r.id,
    user_id: '',
    recipe_id: r.id,
    titulo: r.titulo,
    fonte: 'spoonacular',
    thumbnail_url: r.thumbnail_url,
    source_url: r.source_url,
    macros: r.macros,
    tempo_minutos: r.tempo_minutos,
    filtros: r.filtros,
    colecao: 'favoritos',
    created_at: '',
    updated_at: '',
  };
}

export default function SearchScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const limit = profile?.plano === 'free' ? LIMITS.free.saved_recipes : LIMITS.premium.saved_recipes;
  const { usarDespensa: usarDespensaParam } = useLocalSearchParams<{ usarDespensa?: string }>();
  const { items: pantryItems } = usePantry(user?.id);
  const { ingredients, filtros, results, loading, error, addIngredient, removeIngredient, toggleFiltro, usarDespensa } =
    useRecipeSearch();
  const { items: savedItems, save, unsave } = useSavedRecipes(user?.id);
  const { addFromRecipe } = useShoppingList(user?.id);
  const { fetchIngredients } = useRecipeIngredients();
  const [inputText, setInputText] = useState('');
  const [usandoDespensa, setUsandoDespensa] = useState(false);
  const [detalheRecipe, setDetalheRecipe] = useState<RecipeSearchResult | null>(null);
  const suggestions = useIngredientAutocomplete(inputText);

  // Mapa recipe_id -> id do registo guardado, derivado da store partilhada
  // (a mesma que o ecrã de Favoritos lê). Guardar/remover aqui atualiza essa
  // store, por isso os dois ecrãs ficam sempre em sincronia.
  const savedMap = new Map(savedItems.map((r) => [r.recipe_id, r.id]));
  const limitReached = savedMap.size >= limit;

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
      await unsave(savedId);
    } else {
      if (limitReached) return;
      await save({
        recipe_id:     recipe.id,
        titulo:        recipe.titulo,
        fonte:         'spoonacular',
        thumbnail_url: recipe.thumbnail_url,
        source_url:    recipe.source_url,
        macros:        recipe.macros,
        tempo_minutos: recipe.tempo_minutos,
        filtros:       recipe.filtros,
        colecao:       'favoritos',
      });
    }
  }

  async function handleAddToList(recipe: RecipeSearchResult) {
    const ingredientes = await fetchIngredients(recipe.id);
    const count = await addFromRecipe(recipe.id, ingredientes, pantryItems);
    Alert.alert(count > 0 ? t('favoritos.itensAdicionados', { count }) : t('favoritos.tudoEmCasa'));
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          {t('search.titulo')}
        </Text>

        <Input
          label={t('search.adicionarIngrediente')}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSubmitIngredient}
          placeholder={t('search.placeholderIngrediente')}
        />

        {suggestions.length > 0 && (
          <IngredientAutocompleteList suggestions={suggestions} onSelect={handleSelectSuggestion} />
        )}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm }}>
          {ingredients.map((ing) => (
            <IngredientChip key={ing} nome={ing} onRemove={() => removeIngredient(ing)} />
          ))}
        </View>
        <Pill label={t('search.usarDespensa')} selected={usandoDespensa} onPress={handleToggleDespensa} />
        <FilterRow filtrosSelecionados={filtros} onToggle={toggleFiltro} />
      </View>

      {limitReached && (
        <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <PremiumLock mensagem={t('search.limiteGuardadasAtingido', { limite: limit })} />
        </View>
      )}

      {ingredients.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
            {t('search.semIngredientes')}
          </Text>
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
            {error}
          </Text>
        </View>
      ) : loading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xl }} />
      ) : results.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
            {t('search.semResultados')}
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
              onAddToList={() => handleAddToList(item)}
              onPress={() => setDetalheRecipe(item)}
            />
          )}
        />
      )}

      <RecipeDetailModal
        visible={!!detalheRecipe}
        recipe={detalheRecipe ? toDetailRecipe(detalheRecipe) : null}
        onClose={() => setDetalheRecipe(null)}
        onAddToList={() => detalheRecipe && handleAddToList(detalheRecipe)}
        podeAdicionarLista
      />
    </SafeAreaView>
  );
}
