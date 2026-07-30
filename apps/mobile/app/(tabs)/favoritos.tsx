import { useState } from 'react';
import { View, Text, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import { usePantry } from '@/hooks/usePantry';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useRecipeIngredients } from '@/hooks/useRecipeIngredients';
import { Pill } from '@/components/ui/Pill';
import { FilterRow } from '@/components/recipe/FilterRow';
import { SavedRecipeCard } from '@/components/recipe/SavedRecipeCard';
import { ColecaoPickerModal } from '@/components/recipe/ColecaoPickerModal';
import { CreateColecaoModal } from '@/components/recipe/CreateColecaoModal';
import { RecipeDetailModal } from '@/components/recipe/RecipeDetailModal';
import { getColecoesDisponiveis, isColecaoPadrao } from '@/constants/favoritos';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import { FONTES_FAVORITOS } from '@emealia/config';
import type { SavedRecipe, FiltroDietetico, RecipeSource } from '@emealia/types';

export default function FavoritosScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { items, customColecoes, moveToColecao, createColecao, deleteColecao } = useSavedRecipes(user?.id);
  const { items: pantryItems } = usePantry(user?.id);
  const { addFromRecipe } = useShoppingList(user?.id);
  const { fetchIngredients } = useRecipeIngredients();

  const [colecaoActual, setColecaoActual]           = useState('favoritos');
  const [filtrosSelecionados, setFiltrosSelecionados] = useState<FiltroDietetico[]>([]);
  const [fontesSelecionadas, setFontesSelecionadas]   = useState<RecipeSource[]>([]);
  const [pickerVisible, setPickerVisible]           = useState(false);
  const [recipeParaMover, setRecipeParaMover]       = useState<SavedRecipe | null>(null);
  const [createColecaoVisible, setCreateColecaoVisible] = useState(false);
  const [detalheRecipe, setDetalheRecipe]           = useState<SavedRecipe | null>(null);

  const colecoes = getColecoesDisponiveis(items, customColecoes);

  function toggleFiltro(f: FiltroDietetico) {
    setFiltrosSelecionados((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function toggleFonte(f: RecipeSource) {
    setFontesSelecionadas((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  }

  function handleColecaoLongPress(nome: string) {
    if (isColecaoPadrao(nome)) return;
    Alert.alert(t('favoritos.eliminarColecaoTitulo'), t('favoritos.eliminarColecaoMensagem', { nome }), [
      { text: t('common.cancelar'), style: 'cancel' },
      {
        text: t('common.eliminar'),
        style: 'destructive',
        onPress: () => {
          deleteColecao(nome);
          if (colecaoActual === nome) setColecaoActual('favoritos');
        },
      },
    ]);
  }

  function handleLongPressRecipe(recipe: SavedRecipe) {
    setRecipeParaMover(recipe);
    setPickerVisible(true);
  }

  async function handleAddToList(recipe: SavedRecipe) {
    const ingredientes = await fetchIngredients(recipe.recipe_id);
    const count = await addFromRecipe(recipe.recipe_id, ingredientes, pantryItems);
    Alert.alert(count > 0 ? t('favoritos.itensAdicionados', { count }) : t('favoritos.tudoEmCasa'));
  }

  const itemsFiltrados = items.filter(
    (i) =>
      i.colecao === colecaoActual &&
      (filtrosSelecionados.length === 0 || filtrosSelecionados.some((f) => i.filtros.includes(f))) &&
      (fontesSelecionadas.length === 0 || fontesSelecionadas.includes(i.fonte))
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          {t('favoritos.titulo')}
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap' }}>
        {colecoes.map((c) => (
          <Pill
            key={c.value}
            label={c.labelKey ? t(c.labelKey) : (c.label ?? c.value)}
            selected={colecaoActual === c.value}
            onPress={() => setColecaoActual(c.value)}
            onLongPress={() => handleColecaoLongPress(c.value)}
          />
        ))}
        <Pill label={t('favoritos.novaColecao')} selected={false} onPress={() => setCreateColecaoVisible(true)} />
      </View>

      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <FilterRow filtrosSelecionados={filtrosSelecionados} onToggle={toggleFiltro} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {FONTES_FAVORITOS.map((f) => (
            <Pill
              key={f.value}
              label={t(`config.fontesFavoritos.${f.value}`)}
              selected={fontesSelecionadas.includes(f.value)}
              onPress={() => toggleFonte(f.value)}
            />
          ))}
        </View>
      </View>

      <FlatList
        data={itemsFiltrados}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        renderItem={({ item }) => (
          <SavedRecipeCard
            recipe={item}
            onPress={() => setDetalheRecipe(item)}
            onLongPress={() => handleLongPressRecipe(item)}
          />
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl }}>
            <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
              {t('favoritos.colecaoVazia')}
            </Text>
          </View>
        }
      />

      <ColecaoPickerModal
        visible={pickerVisible}
        colecoes={colecoes}
        onSelect={(novaColecao) => {
          if (recipeParaMover) moveToColecao(recipeParaMover.id, novaColecao);
        }}
        onClose={() => setPickerVisible(false)}
      />

      <CreateColecaoModal
        visible={createColecaoVisible}
        coleccoesExistentes={colecoes.map((c) => c.value)}
        onCreate={createColecao}
        onClose={() => setCreateColecaoVisible(false)}
      />

      <RecipeDetailModal
        visible={!!detalheRecipe}
        recipe={detalheRecipe}
        onClose={() => setDetalheRecipe(null)}
        onAddToList={() => detalheRecipe && handleAddToList(detalheRecipe)}
        podeAdicionarLista={detalheRecipe?.fonte === 'spoonacular'}
      />
    </SafeAreaView>
  );
}
