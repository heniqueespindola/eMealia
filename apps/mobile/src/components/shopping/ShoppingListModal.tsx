import { useState } from 'react';
import { Modal, View, Text, SectionList, Pressable, Alert, Share } from 'react-native';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useShoppingListExport } from '@/hooks/useShoppingListExport';
import { ShoppingListItemRow } from './ShoppingListItemRow';
import { ShoppingListAddForm } from './ShoppingListAddForm';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { agruparPorComprado } from '@/constants/shopping';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Profile, ShoppingListItem } from '@emealia/types';

interface ShoppingListModalProps {
  visible: boolean;
  onClose: () => void;
  userId:  string | undefined;
  profile: Profile | null;
}

function formatarListaTexto(items: ShoppingListItem[]): string {
  const porComprar = items.filter((i) => !i.comprado);
  const comprados   = items.filter((i) => i.comprado);
  const linha = (i: ShoppingListItem) => `- ${i.nome}${i.quantidade ? ` (${i.quantidade})` : ''}`;
  const blocos: string[] = [];
  if (porComprar.length > 0) blocos.push(['Por comprar:', ...porComprar.map(linha)].join('\n'));
  if (comprados.length > 0) blocos.push(['Comprados:', ...comprados.map(linha)].join('\n'));
  return blocos.join('\n\n');
}

export function ShoppingListModal({ visible, onClose, userId, profile }: ShoppingListModalProps) {
  const { items, addManual, toggleComprado, remove, clear } = useShoppingList(userId);
  const { exportItems, loading: exporting } = useShoppingListExport();
  const [upgradeVisible, setUpgradeVisible] = useState(false);

  function handleShare() {
    Share.share({ message: formatarListaTexto(items) });
  }

  function handleExport() {
    if (profile?.plano === 'free') {
      setUpgradeVisible(true);
      return;
    }
    exportItems(items.filter((i) => !i.comprado));
  }

  function handleClear() {
    Alert.alert('Limpar lista', 'Eliminar todos os itens?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => clear() },
    ]);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bgDark, padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.primary }}>Lista de compras</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted }}>Fechar</Text>
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
              {section.label}
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
                A tua lista de compras está vazia.
              </Text>
            </View>
          }
        />

        {upgradeVisible && profile?.plano === 'free' && (
          <Card style={{ marginTop: spacing.sm }}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted }}>
              A exportação para Lembretes/Tasks é exclusiva do plano Premium. Faz upgrade para exportares a tua lista.
            </Text>
          </Card>
        )}

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button label="Partilhar" variant="outline" onPress={handleShare} disabled={items.length === 0} />
          <Button
            label="Exportar para Lembretes/Tasks"
            onPress={handleExport}
            loading={exporting}
            disabled={items.filter((i) => !i.comprado).length === 0}
          />
          <Button label="Limpar lista" variant="outline" onPress={handleClear} disabled={items.length === 0} />
        </View>
      </View>
    </Modal>
  );
}
