import { useEffect, useState } from 'react';
import { View, Text, Pressable, SectionList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePantry } from '@/hooks/usePantry';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PantryItemCard } from '@/components/pantry/PantryItemCard';
import { PantryItemForm } from '@/components/pantry/PantryItemForm';
import { ShoppingListModal } from '@/components/shopping/ShoppingListModal';
import { agruparPorCategoria } from '@/constants/pantry';
import { colors, fonts, spacing } from '@/constants/theme';
import { LIMITS } from '@emealia/config';
import type { PantryItem } from '@emealia/types';

export default function PantryScreen() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { items, loading, add, update, remove, refetch } = usePantry(user?.id);

  const [refreshing, setRefreshing]   = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);
  const [listaVisible, setListaVisible] = useState(false);

  const limit        = profile?.plano === 'free' ? LIMITS.free.pantry_items : LIMITS.premium.pantry_items;
  const limitReached = items.length >= limit;

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading]);

  function handleRefresh() {
    setRefreshing(true);
    refetch();
  }

  function openCreate() {
    setEditingItem(null);
    setFormVisible(true);
  }

  function openEdit(item: PantryItem) {
    setEditingItem(item);
    setFormVisible(true);
  }

  async function handleFormSubmit(values: {
    nome: string;
    quantidade: string | null;
    expira_em: string | null;
    categoria: PantryItem['categoria'];
    barcode: string | null;
  }) {
    if (editingItem) {
      await update(editingItem.id, values);
    } else {
      await add(values);
    }
    setFormVisible(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View
        style={{
          flexDirection:   'row',
          justifyContent:  'space-between',
          alignItems:      'center',
          paddingHorizontal: spacing.lg,
          paddingTop:        spacing.md,
        }}
      >
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          Despensa
        </Text>
        <Pressable onPress={() => setListaVisible(true)} hitSlop={8}>
          <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted }}>
            🛒 Lista de compras
          </Text>
        </Pressable>
      </View>

      {limitReached && (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <Card>
            <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted }}>
              Atingiste o limite de {limit} itens do plano Grátis. Faz upgrade para Premium para adicionares mais.
            </Text>
          </Card>
        </View>
      )}

      <SectionList
        sections={agruparPorCategoria(items)}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, flexGrow: 1 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        renderSectionHeader={({ section }) => (
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm }}>
            {section.label}
          </Text>
        )}
        renderItem={({ item }) => (
          <PantryItemCard item={item} onEdit={() => openEdit(item)} onDelete={() => remove(item.id)} />
        )}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl }}>
            <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
              A tua despensa está vazia. Adiciona o primeiro ingrediente para começares.
            </Text>
          </View>
        }
      />

      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Button label="+ Adicionar" onPress={openCreate} disabled={limitReached} />
        <Button
          label="Cozinhar agora"
          variant="outline"
          disabled={items.length === 0}
          onPress={() => router.push({ pathname: '/(tabs)/search', params: { usarDespensa: '1' } })}
        />
      </View>

      <PantryItemForm
        visible={formVisible}
        onClose={() => setFormVisible(false)}
        onSubmit={handleFormSubmit}
        initialValues={editingItem ?? undefined}
        limitReached={limitReached}
      />

      <ShoppingListModal
        visible={listaVisible}
        onClose={() => setListaVisible(false)}
        userId={user?.id}
        profile={profile}
      />
    </SafeAreaView>
  );
}
