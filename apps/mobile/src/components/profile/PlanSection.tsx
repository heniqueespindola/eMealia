import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Purchases from 'react-native-purchases';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { useTranslation } from '@/hooks/useTranslation';
import { PREMIUM_ENTITLEMENT_ID } from '@/lib/revenuecat';
import { formatarData } from '@/i18n/formatDate';
import { PaywallModal } from '@/components/paywall/PaywallModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Profile } from '@emealia/types';

interface PlanSectionProps {
  userId:  string;
  profile: Profile;
}

export function PlanSection({ userId, profile }: PlanSectionProps) {
  const { t } = useTranslation();
  const { restaurar, restoring } = useRevenueCat(userId);
  const { abrirUpgrade } = useLocalSearchParams<{ abrirUpgrade?: string }>();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [dataRenovacao, setDataRenovacao] = useState<string | null>(null);

  useEffect(() => {
    if (abrirUpgrade === '1') setPaywallVisible(true);
  }, [abrirUpgrade]);

  useEffect(() => {
    Purchases.getCustomerInfo()
      .then((customerInfo) => {
        const expirationDate = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID]?.expirationDate;
        if (expirationDate) {
          setDataRenovacao(formatarData(new Date(expirationDate), profile.idioma));
        }
      })
      .catch(() => {});
  }, [profile.idioma]);

  return (
    <>
      <Card style={{ marginBottom: spacing.md }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs }}>
          {t('profile.planoActual')}
        </Text>
        <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.textInverted }}>
          {t(`config.planos.${profile.plano}`)}
        </Text>
        {profile.plano !== 'free' && dataRenovacao && (
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: spacing.xs }}>
            {t('profile.renovaA', { data: dataRenovacao })}
          </Text>
        )}
        <View style={{ marginTop: spacing.md }}>
          {profile.plano === 'free' ? (
            <Button label={t('profile.fazerUpgrade')} onPress={() => setPaywallVisible(true)} />
          ) : (
            <Button label={t('profile.gerirSubscricao')} variant="outline" onPress={() => Purchases.showManageSubscriptions()} />
          )}
        </View>
      </Card>

      <Card style={{ marginBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.textInverted }}>
            {t('profile.dashboardMacros')}
          </Text>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </View>
        <View style={{ marginTop: spacing.sm }}>
          <Button label={t('profile.verObjectivos')} variant="outline" onPress={() => router.push('/macros')} />
        </View>
      </Card>

      <Button label={t('profile.restaurarCompras')} variant="outline" onPress={restaurar} loading={restoring} />

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} userId={userId} />
    </>
  );
}
