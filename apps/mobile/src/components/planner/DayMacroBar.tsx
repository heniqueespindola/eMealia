import { View, Text } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { colors, fonts } from '@/constants/theme';
import type { MacroNutrients } from '@emealia/types';

interface DayMacroBarProps {
  totais:  MacroNutrients;
  parcial: boolean;
}

export function DayMacroBar({ totais, parcial }: DayMacroBarProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.textMuted }}>
        {totais.calorias} kcal
      </Text>
      {parcial && <Badge label="parcial" variant="alerta" />}
    </View>
  );
}
