import { View, Text } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { MacroProgressBar } from './MacroProgressBar';
import { colors, fonts, spacing } from '@/constants/theme';
import type { MacroNutrients, MacroTargets } from '@emealia/types';

interface MacroProgressSectionProps {
  totais:  MacroNutrients;
  metas:   MacroTargets;
  parcial: boolean;
}

export function MacroProgressSection({ totais, metas, parcial }: MacroProgressSectionProps) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.textInverted }}>Hoje</Text>
        {parcial && <Badge label="parcial" />}
      </View>

      <MacroProgressBar label="Calorias" atual={totais.calorias} meta={metas.meta_calorias} unidade="kcal" />
      <MacroProgressBar label="Proteínas" atual={totais.proteinas} meta={metas.meta_proteinas} unidade="g" />
      <MacroProgressBar label="Hidratos" atual={totais.hidratos} meta={metas.meta_hidratos} unidade="g" />
      <MacroProgressBar label="Gorduras" atual={totais.gorduras} meta={metas.meta_gorduras} unidade="g" />
    </Card>
  );
}
