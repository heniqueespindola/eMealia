import { View, ViewProps } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

export function Card({ style, children, ...rest }: ViewProps) {
  return (
    <View {...rest} style={[{ backgroundColor: colors.bgDarkAlt, borderRadius: radius.lg, padding: spacing.md }, style]}>
      {children}
    </View>
  );
}
