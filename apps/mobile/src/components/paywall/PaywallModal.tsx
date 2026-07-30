import { Modal, View, Text, Pressable, ScrollView, Alert } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { PlanComparisonTable } from './PlanComparisonTable';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import { PLANS } from '@emealia/config';
import { useRevenueCat } from '@/hooks/useRevenueCat';

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | undefined;
}

export function PaywallModal({ visible, onClose, userId }: PaywallModalProps) {
  const { t } = useTranslation();
  const { offering, purchasing, restoring, comprar, restaurar } = useRevenueCat(userId);

  async function handleComprar(pacote: PurchasesPackage | null, plano: string) {
    if (!pacote) return;
    const resultado = await comprar(pacote);
    if (resultado.ok) {
      Alert.alert(t('paywall.subscricaoAtivadaTitulo'), t('paywall.subscricaoAtivadaMensagem', { plano }));
      onClose();
    } else if (!resultado.cancelado) {
      Alert.alert(t('paywall.compraFalhouTitulo'), t('paywall.compraFalhouMensagem'));
    }
  }

  async function handleRestaurar() {
    const ok = await restaurar();
    if (ok) {
      Alert.alert(t('paywall.comprasRestauradasTitulo'), t('paywall.comprasRestauradasMensagem'));
      onClose();
    }
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: colors.bgDark, padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.primary }}>{t('paywall.fazerUpgrade')}</Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted }}>{t('paywall.fechar')}</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>
          <PlanComparisonTable />

          {!offering && (
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: spacing.md }}>
              {t('paywall.comprasIndisponiveis')}
            </Text>
          )}
        </ScrollView>

        <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
          <Button
            label={t('paywall.planoMensalBotao', { preco: PLANS.premium_monthly.price.toFixed(2) })}
            onPress={() => handleComprar(offering?.monthly ?? null, t('config.planos.premium_monthly'))}
            loading={purchasing}
            disabled={!offering?.monthly}
          />
          <Button
            label={t('paywall.planoAnualBotao', { preco: PLANS.premium_annual.price.toFixed(2) })}
            onPress={() => handleComprar(offering?.annual ?? null, t('config.planos.premium_annual'))}
            loading={purchasing}
            disabled={!offering?.annual}
          />
          <Button label={t('paywall.restaurarCompras')} variant="outline" onPress={handleRestaurar} loading={restoring} />
        </View>
      </View>
    </Modal>
  );
}
