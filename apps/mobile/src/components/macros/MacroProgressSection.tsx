import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MacroProgressBar } from './MacroProgressBar';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import type { MacroNutrients, MacroTargets } from '@emealia/types';

interface MacroProgressSectionProps {
  totais:  MacroNutrients;
  metas:   MacroTargets;
  parcial: boolean;
}

export function MacroProgressSection({ totais, metas, parcial }: MacroProgressSectionProps) {
  const { t } = useTranslation();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.textInverted }}>{t('macros.hoje')}</Text>
        {parcial && <Badge label={t('macros.parcial')} />}
      </View>

      <MacroProgressBar label={t('macros.calorias')} atual={totais.calorias} meta={metas.meta_calorias} unidade="kcal" />
      <MacroProgressBar label={t('macros.proteinas')} atual={totais.proteinas} meta={metas.meta_proteinas} unidade="g" />
      <MacroProgressBar label={t('macros.hidratos')} atual={totais.hidratos} meta={metas.meta_hidratos} unidade="g" />
      <MacroProgressBar label={t('macros.gorduras')} atual={totais.gorduras} meta={metas.meta_gorduras} unidade="g" />
    </Card>
  );
}
