import { useEffect } from 'react';
import { Modal, View, Text, Image, ScrollView, Pressable } from 'react-native';
import * as Linking from 'expo-linking';
import { Button } from '@/components/ui/Button';
import { SourceBadge } from '@/components/feed/SourceBadge';
import { colors, fonts, spacing } from '@/constants/theme';
import { FILTROS_DIETETICOS } from '@emealia/config';
import { cacheViewedRecipe } from '@/lib/offline/recipeCache';
import type { SavedRecipe } from '@emealia/types';

interface RecipeDetailModalProps {
  visible:             boolean;
  recipe:              SavedRecipe | null;
  onClose:             () => void;
  onAddToList:         () => void;
  podeAdicionarLista:  boolean;
  addingToList?:       boolean;
}

export function RecipeDetailModal({
  visible,
  recipe,
  onClose,
  onAddToList,
  podeAdicionarLista,
  addingToList,
}: RecipeDetailModalProps) {
  useEffect(() => {
    if (recipe) cacheViewedRecipe(recipe);
  }, [recipe?.id]);

  if (!recipe) return null;

  function handleOpenSource() {
    if (recipe!.source_url) Linking.openURL(recipe!.source_url);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bgDark }} contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.sm }}>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted }}>Fechar</Text>
          </Pressable>
        </View>

        {recipe.thumbnail_url ? (
          <Image
            source={{ uri: recipe.thumbnail_url }}
            resizeMode="cover"
            style={{ width: '100%', height: 200, borderRadius: 20, marginBottom: spacing.md }}
          />
        ) : null}

        <View style={{ marginBottom: spacing.sm }}>
          <SourceBadge fonte={recipe.fonte} />
        </View>

        <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.primary, marginBottom: spacing.md }}>
          {recipe.titulo}
        </Text>

        {recipe.tempo_minutos != null && (
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginBottom: spacing.md }}>
            {recipe.tempo_minutos} min
          </Text>
        )}

        {recipe.macros && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
            {[
              { label: 'Calorias',   valor: `${recipe.macros.calorias} kcal` },
              { label: 'Proteínas',  valor: `${recipe.macros.proteinas} g` },
              { label: 'Hidratos',   valor: `${recipe.macros.hidratos} g` },
              { label: 'Gorduras',   valor: `${recipe.macros.gorduras} g` },
            ].map((m) => (
              <View key={m.label} style={{ width: '50%', marginBottom: spacing.sm }}>
                <Text style={{ fontFamily: fonts.bold, fontSize: 18, color: colors.textInverted }}>{m.valor}</Text>
                <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>{m.label}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
          {recipe.filtros.map((f) => (
            <View
              key={f}
              style={{
                backgroundColor: colors.primary,
                borderRadius:    9999,
                paddingHorizontal: 10,
                paddingVertical:   4,
                marginRight:       6,
                marginBottom:      6,
              }}
            >
              <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.primaryDark }}>
                {FILTROS_DIETETICOS.find((opt) => opt.value === f)?.label}
              </Text>
            </View>
          ))}
        </View>

        <Button label="Abrir receita original" onPress={handleOpenSource} disabled={!recipe.source_url} />

        <View style={{ marginTop: spacing.sm }}>
          <Button
            label="Adicionar à lista de compras"
            onPress={onAddToList}
            disabled={!podeAdicionarLista || addingToList}
          />
          {!podeAdicionarLista && (
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: spacing.sm }}>
              Esta receita não tem lista de ingredientes estruturada — adiciona os itens manualmente na lista de compras.
            </Text>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}
