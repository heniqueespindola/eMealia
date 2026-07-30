import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';

interface PremiumLockProps {
  mensagem: string;
}

export function PremiumLock({ mensagem }: PremiumLockProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Ionicons name="lock-closed" size={20} color={colors.primary} />
        <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted }}>
          {mensagem}
        </Text>
      </View>
      <Button
        label={t('paywall.fazerUpgrade')}
        onPress={() => router.push({ pathname: '/(tabs)/profile', params: { abrirUpgrade: '1' } })}
      />
    </Card>
  );
}
