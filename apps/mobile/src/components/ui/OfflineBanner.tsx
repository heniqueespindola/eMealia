import { View, Text } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';

export function OfflineBanner() {
  const { t } = useTranslation();
  const { isOffline } = useNetworkStatus();
  if (!isOffline) return null;
  return (
    <View style={{ backgroundColor: colors.primaryDark, paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.textInverted, textAlign: 'center' }}>
        {t('offline.banner')}
      </Text>
    </View>
  );
}
