import { View, Text } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { colors, fonts, spacing } from '@/constants/theme';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  if (!isOffline) return null;
  return (
    <View style={{ backgroundColor: colors.primaryDark, paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.textInverted, textAlign: 'center' }}>
        Modo offline — algumas funcionalidades podem não estar disponíveis
      </Text>
    </View>
  );
}
