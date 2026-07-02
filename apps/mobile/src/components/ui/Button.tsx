import { Pressable, Text, ActivityIndicator } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
}

export function Button({ label, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: isPrimary ? colors.primary : 'transparent',
        borderWidth: isPrimary ? 0 : 1,
        borderColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: 14,
        alignItems: 'center',
        opacity: disabled || loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.primaryDark : colors.primary} />
      ) : (
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: isPrimary ? colors.primaryDark : colors.primary }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
