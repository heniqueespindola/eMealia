import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { colors, fonts, spacing } from '@/constants/theme';

interface MacroDeviationAlertProps {
  diasExcedidos: number;
}

export function MacroDeviationAlert({ diasExcedidos }: MacroDeviationAlertProps) {
  return (
    <Card style={{ borderWidth: 1, borderColor: colors.primaryDark, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="alert-circle" size={20} color={colors.primaryDark} />
        <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textInverted }}>
          Excedeste o teu objectivo calórico em {diasExcedidos} dos últimos 7 dias.
        </Text>
      </View>
    </Card>
  );
}
