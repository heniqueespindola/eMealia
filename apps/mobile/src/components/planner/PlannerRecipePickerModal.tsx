import { useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { PlannerFavoritosTab } from './PlannerFavoritosTab';
import { PlannerSearchTab } from './PlannerSearchTab';
import { Pill } from '@/components/ui/Pill';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import type { SavedRecipe, PantryItem, RecipeSource } from '@emealia/types';

interface Receita {
  recipe_id: string;
  titulo:    string;
  fonte:     RecipeSource;
}

interface PlannerRecipePickerModalProps {
  visible:     boolean;
  favoritos:   SavedRecipe[];
  pantryItems: PantryItem[];
  onSelect:    (receita: Receita) => void;
  onClose:     () => void;
}

export function PlannerRecipePickerModal({
  visible,
  favoritos,
  pantryItems,
  onSelect,
  onClose,
}: PlannerRecipePickerModalProps) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'favoritos' | 'pesquisa'>('favoritos');

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bgDark, padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.primary }}>
            {t('planner.escolherReceita')}
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted }}>{t('common.fechar')}</Text>
          </Pressable>
        </View>

        <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
          <Pill label={t('favoritos.titulo')} selected={tab === 'favoritos'} onPress={() => setTab('favoritos')} />
          <Pill label={t('search.titulo')} selected={tab === 'pesquisa'} onPress={() => setTab('pesquisa')} />
        </View>

        {tab === 'favoritos' ? (
          <PlannerFavoritosTab favoritos={favoritos} onSelect={onSelect} />
        ) : (
          <PlannerSearchTab pantryItems={pantryItems} onSelect={onSelect} />
        )}
      </View>
    </Modal>
  );
}
