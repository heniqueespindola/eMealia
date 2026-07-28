import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatarIntervaloSemana } from '@/constants/planner';
import { colors, fonts, spacing } from '@/constants/theme';

interface WeekNavigatorProps {
  semanaInicio: string;
  onPrev:       () => void;
  onNext:       () => void;
}

export function WeekNavigator({ semanaInicio, onPrev, onNext }: WeekNavigatorProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
      <Pressable onPress={onPrev} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.primary} />
      </Pressable>
      <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textInverted }}>
        Semana de {formatarIntervaloSemana(semanaInicio)}
      </Text>
      <Pressable onPress={onNext} hitSlop={8}>
        <Ionicons name="chevron-forward" size={22} color={colors.primary} />
      </Pressable>
    </View>
  );
}
