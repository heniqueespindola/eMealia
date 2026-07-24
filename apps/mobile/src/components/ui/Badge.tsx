import { View, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface BadgeProps {
  label:   string;
  variant?: 'default' | 'alerta';
}

export function Badge({ label, variant = 'default' }: BadgeProps) {
  const isAlerta = variant === 'alerta';
  return (
    <View style={{
      backgroundColor: isAlerta ? colors.primaryDark : colors.primary,
      borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start',
    }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 11, color: isAlerta ? colors.textInverted : colors.primaryDark }}>
        {label}
      </Text>
    </View>
  );
}
