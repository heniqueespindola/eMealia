import { Modal, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { PlanComparisonTable } from './PlanComparisonTable';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import { PLANS } from '@emealia/config';
import { useRevenueCat } from '@/hooks/useRevenueCat';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | undefined;
}

export function PaywallModal({ visible, onClose, userId }: PaywallModalProps) {
  const { offering, purchasing, restoring, comprar, restaurar } = useRevenueCat(userId);

  async function handleComprar(pacote: PurchasesPackage | null, label: string) {
    if (!pacote) return;
    const resultado = await comprar(pacote);
    if (resultado.ok) {
      Alert.alert('Subscrição activada', `A tua subscrição ${label} está activa.`);
      onClose();
    } else if (!resultado.cancelado) {
      Alert.alert('Não foi possível completar a compra', 'Tenta novamente mais tarde.');
    }
  }

  async function handleRestaurar() {
    const ok = await restaurar();
    if (ok) {
      Alert.alert('Compras restauradas', 'O teu plano foi actualizado.');
      onClose();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bgDark, padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.primary }}>Fazer upgrade</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted }}>Fechar</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
          <PlanComparisonTable />

          {!offering && (
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: spacing.md }}>
              As opções de compra não estão disponíveis de momento.
            </Text>
          )}
        </ScrollView>

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            label={`Premium Mensal — €${PLANS.premium_monthly.price.toFixed(2)}/mês`}
            onPress={() => handleComprar(offering?.monthly ?? null, 'Premium Mensal')}
            loading={purchasing}
            disabled={!offering?.monthly}
          />
          <Button
            label={`Premium Anual — €${PLANS.premium_annual.price.toFixed(2)}/ano`}
            onPress={() => handleComprar(offering?.annual ?? null, 'Premium Anual')}
            loading={purchasing}
            disabled={!offering?.annual}
          />
          <Button label="Restaurar compras" variant="outline" onPress={handleRestaurar} loading={restoring} />
        </View>
      </View>
    </Modal>
  );
}
