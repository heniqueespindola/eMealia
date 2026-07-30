import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Purchases from 'react-native-purchases';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useRevenueCat } from '@/hooks/useRevenueCat';
import { PREMIUM_ENTITLEMENT_ID } from '@/lib/revenuecat';
import { PaywallModal } from '@/components/paywall/PaywallModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';
import { PLANS } from '@emealia/config';

export default function ProfileScreen() {
  const { user } = useAuth();
  const { profile, loading } = useProfile(user?.id);
  const { restaurar, restoring } = useRevenueCat(user?.id);
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
          setDataRenovacao(new Intl.DateTimeFormat('pt-PT', { dateStyle: 'long' }).format(new Date(expirationDate)));
        }
      })
      .catch(() => {});
  }, []);

  if (loading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>Perfil</Text>

        <Card>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.textMuted, marginBottom: spacing.xs }}>
            Plano actual
          </Text>
          <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.textInverted }}>
            {PLANS[profile.plano].label}
          </Text>
          {profile.plano !== 'free' && dataRenovacao && (
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: spacing.xs }}>
              Renova a {dataRenovacao}
            </Text>
          )}
          <View style={{ marginTop: spacing.md }}>
            {profile.plano === 'free' ? (
              <Button label="Fazer upgrade" onPress={() => setPaywallVisible(true)} />
            ) : (
              <Button label="Gerir subscrição" variant="outline" onPress={() => Purchases.showManageSubscriptions()} />
            )}
          </View>
        </Card>

        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.textInverted }}>
              Dashboard de Macros
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <View style={{ marginTop: spacing.sm }}>
            <Button label="Ver objectivos e progresso" variant="outline" onPress={() => router.push('/macros')} />
          </View>
        </Card>

        <Button label="Restaurar compras" variant="outline" onPress={restaurar} loading={restoring} />
      </ScrollView>

      <PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} userId={user?.id} />
    </SafeAreaView>
  );
}
