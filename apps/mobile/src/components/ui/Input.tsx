import { View, Text, TextInput, TextInputProps } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, ...rest }: InputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.bgDarkAlt,
          borderWidth: 1,
          borderColor: error ? colors.primaryDark : colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.textInverted,
          fontFamily: fonts.regular,
          fontSize: 15,
        }}
      />
      {error ? (
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.primaryDark, marginTop: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
