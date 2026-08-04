import { useState } from 'react';
import { Modal, View, Text, SectionList, Pressable, Alert, Share } from 'react-native';
import { useTranslation } from '@/hooks/useTranslation';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useShoppingListExport } from '@/hooks/useShoppingListExport';
import { ShoppingListItemRow } from './ShoppingListItemRow';
import { ShoppingListAddForm } from './ShoppingListAddForm';
import { Button } from '@/components/ui/Button';
import { PremiumLock } from '@/components/paywall/PremiumLock';
import { agruparPorComprado } from '@/constants/shopping';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Profile, ShoppingListItem } from '@emealia/types';

interface ShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  userId:  string | undefined;
  profile: Profile | null;
}

function formatarListaTexto(items: ShoppingListItem[], t: (key: string) => string): string {
  const porComprar = items.filter((i) => !i.comprado);
  const comprados   = items.filter((i) => i.comprado);
  const linha = (i: ShoppingListItem) => `- ${i.nome}${i.quantidade ? ` (${i.quantidade})` : ''}`;
  const blocos: string[] = [];
  if (porComprar.length > 0) blocos.push([t('shopping.porComprar'), ...porComprar.map(linha)].join('\n'));
  if (comprados.length > 0) blocos.push([t('shopping.comprados'), ...comprados.map(linha)].join('\n'));
  return blocos.join('\n\n');
}

export function ShoppingListModal({ visible, onClose, userId, profile }: ShoppingListModalProps) {
  const { t } = useTranslation();
  const { items, addManual, toggleComprado, remove, clear } = useShoppingList(userId);
  const { exportItems, loading: exporting } = useShoppingListExport();
  const [upgradeVisible, setUpgradeVisible] = useState(false);

  function handleShare() {
    Share.share({ message: formatarListaTexto(items, t) });
  }

  async function handleExport() {
    if (profile?.plano === 'free') {
      setUpgradeVisible(true);
      return;
    }
    try {
      await exportItems(items.filter((i) => !i.comprado));
    } catch (error) {
      Alert.alert('Erro ao exportar', error instanceof Error ? error.message : String(error));
    }
  }

  function handleClear() {
    Alert.alert(t('shopping.limparListaTitulo'), t('shopping.limparListaMensagem'), [
      { text: t('common.cancelar'), style: 'cancel' },
      { text: t('common.eliminar'), style: 'destructive', onPress: () => clear() },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bgDark, padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.primary }}>{t('shopping.titulo')}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted }}>{t('shopping.fechar')}</Text>
          </Pressable>
        </View>

        <ShoppingListAddForm onAdd={(nome) => addManual(nome, null)} />

        <SectionList
          sections={agruparPorComprado(items)}
          keyExtractor={(item) => item.id}
          style={{ marginTop: spacing.md }}
          contentContainerStyle={{ flexGrow: 1 }}
          renderSectionHeader={({ section }) => (
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm }}>
              {t(section.labelKey)}
            </Text>
          )}
          renderItem={({ item }) => (
            <ShoppingListItemRow
              item={item}
              onToggle={() => toggleComprado(item.id, !item.comprado)}
              onDelete={() => remove(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl }}>
              <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
                {t('shopping.vazia')}
              </Text>
            </View>
          }
        />

        {upgradeVisible && profile?.plano === 'free' && (
          <PremiumLock mensagem={t('shopping.exportarPremiumBloqueio')} />
        )}

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button label={t('shopping.partilhar')} variant="outline" onPress={handleShare} disabled={items.length === 0} />
          <Button
            label={t('shopping.exportarLembretes')}
            onPress={handleExport}
            loading={exporting}
            disabled={items.filter((i) => !i.comprado).length === 0}
          />
          <Button label={t('shopping.limparLista')} variant="outline" onPress={handleClear} disabled={items.length === 0} />
        </View>
      </View>
    </Modal>
  );
}
