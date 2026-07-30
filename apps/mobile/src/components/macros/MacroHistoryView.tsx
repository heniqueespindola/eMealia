import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { Badge } from '@/components/ui/Badge';
import { MacroProgressBar } from './MacroProgressBar';
import { formatarIntervaloSemana, segundaFeiraDaSemana } from '@/constants/planner';
import { formatarData } from '@/i18n/formatDate';
import { useTranslation } from '@/hooks/useTranslation';
import { useProfileStore } from '@/stores/profileStore';
import { colors, fonts, spacing } from '@/constants/theme';
import type { MacroDailyTotal, MacroNutrients, MacroTargets, Idioma } from '@emealia/types';

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

function labelPeriodo(periodo: 'semana' | 'mes', dataReferencia: string, idioma: Idioma | null | undefined, t: (key: string, options?: object) => string): string {
  const data = new Date(`${dataReferencia}T00:00:00`);
  if (periodo === 'semana') {
    return t('macros.semanaDe', { intervalo: formatarIntervaloSemana(segundaFeiraDaSemana(data), idioma) });
  }
  return formatarData(data, idioma, { month: 'long', year: 'numeric' });
}

function formatarDiaCurto(data: string): string {
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
  const { t } = useTranslation();
  const idioma = useProfileStore((s) => s.profile?.idioma);
  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: spacing.md }}>
        <Pill label={t('macros.semana')} selected={periodo === 'semana'} onPress={() => onPeriodoChange('semana')} />
        <Pill label={t('macros.mes')} selected={periodo === 'mes'} onPress={() => onPeriodoChange('mes')} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md }}>
        <Pressable onPress={() => onNavegarPeriodo(-1)} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textInverted }}>
          {labelPeriodo(periodo, dataReferencia, idioma, t)}
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
              {t('macros.mediaPeriodo')}
            </Text>
            <MacroProgressBar label={t('macros.calorias')} atual={media.calorias} meta={metas.meta_calorias} unidade="kcal" />
            <MacroProgressBar label={t('macros.proteinas')} atual={media.proteinas} meta={metas.meta_proteinas} unidade="g" />
            <MacroProgressBar label={t('macros.hidratos')} atual={media.hidratos} meta={metas.meta_hidratos} unidade="g" />
            <MacroProgressBar label={t('macros.gorduras')} atual={media.gorduras} meta={metas.meta_gorduras} unidade="g" />
          </Card>

          {dias.length === 0 ? (
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted }}>
              {t('macros.semDados')}
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
                    {formatarDiaCurto(dia.data)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>
                      {dia.calorias} kcal
                    </Text>
                    {excedido && <Badge label={t('macros.excedido')} variant="alerta" />}
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
