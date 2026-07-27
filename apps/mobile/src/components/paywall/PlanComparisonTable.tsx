import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, fonts, spacing } from '@/constants/theme';
import { PLANS } from '@emealia/config';
import type { Plano } from '@emealia/types';

interface PlanComparisonTableProps {
  planoAtual?: Plano;
}

const FEATURE_LABELS: Record<keyof (typeof PLANS)['free']['features'], string> = {
  planeamento_semanal:   'Planeamento semanal',
  macros:                'Contagem de macros',
  export_lembretes:      'Export para Lembretes/Tasks',
  despensa_ilimitada:    'Despensa ilimitada',
  favoritos_ilimitados:  'Favoritos ilimitados',
};

function PlanFeatureRow({ label, incluida }: { label: string; incluida: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 4 }}>
      <Ionicons
        name={incluida ? 'checkmark-circle' : 'close-circle'}
        size={16}
        color={incluida ? colors.primary : colors.textMuted}
      />
      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textInverted }}>{label}</Text>
    </View>
  );
}

export function PlanComparisonTable({ planoAtual }: PlanComparisonTableProps) {
  const planos = Object.entries(PLANS) as [Plano, (typeof PLANS)[Plano]][];

  return (
    <View style={{ gap: spacing.md }}>
      {planos.map(([id, plano]) => (
        <Card key={id} style={planoAtual === id ? { borderWidth: 1, borderColor: colors.primary } : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.primary }}>{plano.label}</Text>
            {plano.melhorValor && <Badge label="Melhor valor" variant="alerta" />}
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.textInverted, marginBottom: spacing.sm }}>
            {plano.price === 0 ? 'Grátis' : `€${plano.price.toFixed(2)}`}
          </Text>
          {(Object.keys(FEATURE_LABELS) as (keyof typeof FEATURE_LABELS)[]).map((key) => (
            <PlanFeatureRow key={key} label={FEATURE_LABELS[key]} incluida={plano.features[key]} />
          ))}
        </Card>
      ))}
    </View>
  );
}
