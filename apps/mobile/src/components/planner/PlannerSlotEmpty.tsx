import { Pressable, Text } from 'react-native';
import { colors, fonts, radius, spacing } from '@/constants/theme';

interface PlannerSlotEmptyProps {
  destacado: boolean;
  onPress:   () => void;
}

export function PlannerSlotEmpty({ destacado, onPress }: PlannerSlotEmptyProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        minHeight: 64,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: destacado ? colors.primary : colors.border,
        borderRadius: radius.lg,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xs,
      }}
    >
      <Text
        style={{
          fontFamily: fonts.medium,
          fontSize: 11,
          color: destacado ? colors.primary : colors.textMuted,
          textAlign: 'center',
        }}
      >
        {destacado ? 'Mover para aqui' : '+ Adicionar'}
      </Text>
    </Pressable>
  );
}
