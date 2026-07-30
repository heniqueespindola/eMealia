import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Badge } from '@/components/ui/Badge';
import { MacroProgressBar } from './MacroProgressBar';
import { formatarIntervaloSemana, segundaFeiraDaSemana } from '@/constants/planner';
import { colors, fonts, spacing } from '@/constants/theme';
import type { MacroDailyTotal, MacroNutrients, MacroTargets } from '@emealia/types';

interface MacroHistoryViewProps {
  dataReferencia:   string;
  periodo:          'semana' | 'mes';
  onPeriodoChange:  (periodo: 'semana' | 'mes') => void;
  onNavegarPeriodo: (direcao: 1 | -1) => void;
  metas:            MacroTargets;
  dias:             MacroDailyTotal[];
  media:            MacroNutrients;
  loading:          boolean;
}

function labelPeriodo(periodo: 'semana' | 'mes', dataReferencia: string): string {
  const data = new Date(`${dataReferencia}T00:00:00`);
  if (periodo === 'semana') {
    return `Semana de ${formatarIntervaloSemana(segundaFeiraDaSemana(data))}`;
  }
  return new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(data);
}

function formatarData(data: string): string {
  const d = new Date(`${data}T00:00:00`);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function MacroHistoryView({
  dataReferencia,
  periodo,
  onPeriodoChange,
  onNavegarPeriodo,
  metas,
  dias,
  media,
  loading,
}: MacroHistoryViewProps) {
  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <Pill label="Semana" selected={periodo === 'semana'} onPress={() => onPeriodoChange('semana')} />
        <Pill label="Mês" selected={periodo === 'mes'} onPress={() => onPeriodoChange('mes')} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Pressable onPress={() => onNavegarPeriodo(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textInverted }}>
          {labelPeriodo(periodo, dataReferencia)}
        </Text>
        <Pressable onPress={() => onNavegarPeriodo(1)} hitSlop={8}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          <Card style={{ marginBottom: spacing.md }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.textInverted, marginBottom: spacing.sm }}>
              Média do período
            </Text>
            <MacroProgressBar label="Calorias" atual={media.calorias} meta={metas.meta_calorias} unidade="kcal" />
            <MacroProgressBar label="Proteínas" atual={media.proteinas} meta={metas.meta_proteinas} unidade="g" />
            <MacroProgressBar label="Hidratos" atual={media.hidratos} meta={metas.meta_hidratos} unidade="g" />
            <MacroProgressBar label="Gorduras" atual={media.gorduras} meta={metas.meta_gorduras} unidade="g" />
          </Card>

          {dias.length === 0 ? (
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted }}>
              Sem dados para este período.
            </Text>
          ) : (
            dias.map((dia) => {
              const excedido = metas.meta_calorias > 0 && dia.calorias > metas.meta_calorias;
              return (
                <View
                  key={dia.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingVertical: spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: colors.bgDarkAlt,
                  }}
                >
                  <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.textInverted }}>
                    {formatarData(dia.data)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>
                      {dia.calorias} kcal
                    </Text>
                    {excedido && <Badge label="excedido" variant="alerta" />}
                  </View>
                </View>
              );
            })
          )}
        </>
      )}
    </View>
  );
}
