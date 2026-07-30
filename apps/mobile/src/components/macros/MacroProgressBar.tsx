import { View, Text } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, radius, spacing } from '@/constants/theme';

interface MacroProgressBarProps {
  label:  string;
  atual:  number;
  meta:   number;
  unidade: string;
}

export function MacroProgressBar({ label, atual, meta, unidade }: MacroProgressBarProps) {
  const { t } = useTranslation();
  const pct = meta > 0 ? Math.min((atual / meta) * 100, 100) : 0;
  const excedido = meta > 0 && atual > meta;

  return (
    <View style={{ marginBottom: spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.textInverted }}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
            {Math.round(atual)}/{meta} {unidade}
          </Text>
          {excedido && <Badge label={t('macros.excedido')} variant="alerta" />}
        </View>
      </View>
      <View style={{ height: 8, borderRadius: radius.full, backgroundColor: colors.bgDarkAlt, overflow: 'hidden' }}>
        <View
          style={{
            width: `${pct}%`,
            height: '100%',
            borderRadius: radius.full,
            backgroundColor: excedido ? colors.primaryDark : colors.primary,
          }}
        />
      </View>
    </View>
  );
}
