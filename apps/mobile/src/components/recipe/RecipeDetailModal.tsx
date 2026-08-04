import { useEffect } from 'react';
import { Modal, View, Text, Image, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Button } from '@/components/ui/Button';
import { SourceBadge } from '@/components/feed/SourceBadge';
import { colors, fonts, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();
  useEffect(() => {
    if (recipe) cacheViewedRecipe(recipe);
  }, [recipe?.id]);

  function handleOpenSource() {
    if (recipe?.source_url) Linking.openURL(recipe.source_url);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
          }}
        >
          <Pressable
            onPress={onClose}
            hitSlop={16}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.bgDarkAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={26} color={colors.textInverted} />
          </Pressable>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
          {recipe && (
            <>
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
              { key: 'calorias',  label: t('recipe.calorias'),  valor: `${recipe.macros.calorias} kcal` },
              { key: 'proteinas', label: t('recipe.proteinas'), valor: `${recipe.macros.proteinas} g` },
              { key: 'hidratos',  label: t('recipe.hidratos'),  valor: `${recipe.macros.hidratos} g` },
              { key: 'gorduras',  label: t('recipe.gorduras'),  valor: `${recipe.macros.gorduras} g` },
            ].map((m) => (
              <View key={m.key} style={{ width: '50%', marginBottom: spacing.sm }}>
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
                {t(`config.filtros.${f}`)}
              </Text>
            </View>
          ))}
        </View>

        <Button label={t('recipe.abrirOriginal')} onPress={handleOpenSource} disabled={!recipe.source_url} />

        <View style={{ marginTop: spacing.sm }}>
          <Button
            label={t('recipe.adicionarListaCompras')}
            onPress={onAddToList}
            disabled={!podeAdicionarLista || addingToList}
          />
          {!podeAdicionarLista && (
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: spacing.sm }}>
              {t('recipe.semIngredientesEstruturados')}
            </Text>
          )}
        </View>
            </>
          )}
      </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
