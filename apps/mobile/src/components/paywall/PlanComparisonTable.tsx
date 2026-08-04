import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { colors, fonts, spacing } from '@/constants/theme';
import { useTranslation } from '@/hooks/useTranslation';
import { PLANS } from '@emealia/config';
import type { Plano } from '@emealia/types';

interface PlanComparisonTableProps {
  planoAtual?: Plano;
}

const FEATURE_KEYS: Record<keyof (typeof PLANS)['free']['features'], string> = {
  planeamento_semanal:   'planComparison.featurePlaneamentoSemanal',
  macros:                'planComparison.featureMacros',
  export_lembretes:      'planComparison.featureExportLembretes',
  despensa_ilimitada:    'planComparison.featureDespensaIlimitada',
  favoritos_ilimitados:  'planComparison.featureFavoritosIlimitados',
  sync_saude:            'planComparison.featureSyncSaude',
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
  const { t } = useTranslation();
  const planos = Object.entries(PLANS) as [Plano, (typeof PLANS)[Plano]][];

  return (
    <View style={{ gap: spacing.md }}>
      {planos.map(([id, plano]) => (
        <Card key={id} style={planoAtual === id ? { borderWidth: 1, borderColor: colors.primary } : undefined}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.primary }}>{t(`config.planos.${id}`)}</Text>
            {plano.melhorValor && <Badge label={t('planComparison.melhorValor')} variant="alerta" />}
          </View>
          <Text style={{ fontFamily: fonts.bold, fontSize: 20, color: colors.textInverted, marginBottom: spacing.sm }}>
            {plano.price === 0 ? t('config.planos.free') : `€${plano.price.toFixed(2)}`}
          </Text>
          {(Object.keys(FEATURE_KEYS) as (keyof typeof FEATURE_KEYS)[]).map((key) => (
            <PlanFeatureRow key={key} label={t(FEATURE_KEYS[key])} incluida={plano.features[key]} />
          ))}
        </Card>
      ))}
    </View>
  );
}
