import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';

interface MacroDeviationAlertProps {
  diasExcedidos: number;
}

export function MacroDeviationAlert({ diasExcedidos }: MacroDeviationAlertProps) {
  const { t } = useTranslation();
  return (
    <Card style={{ borderWidth: 1, borderColor: colors.primaryDark, marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Ionicons name="alert-circle" size={20} color={colors.primaryDark} />
        <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 13, color: colors.textInverted }}>
          {t('macros.excedeuObjectivo', { dias: diasExcedidos })}
        </Text>
      </View>
    </Card>
  );
}
