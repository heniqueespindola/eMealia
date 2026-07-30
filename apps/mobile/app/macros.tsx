import { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePlanner } from '@/hooks/usePlanner';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import { usePlannerMacros } from '@/hooks/usePlannerMacros';
import { useMacroHistory } from '@/hooks/useMacroHistory';
import { useMacroDeviationAlert } from '@/hooks/useMacroDeviationAlert';
import { PremiumLock } from '@/components/paywall/PremiumLock';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { MacroProgressSection } from '@/components/macros/MacroProgressSection';
import { MacroGoalsForm } from '@/components/macros/MacroGoalsForm';
import { MacroHistoryView } from '@/components/macros/MacroHistoryView';
import { MacroDeviationAlert } from '@/components/macros/MacroDeviationAlert';
import { colors, fonts, spacing } from '@/constants/theme';
import { segundaFeiraDaSemana, diaSemanaAtual, adicionarSemanas } from '@/constants/planner';
import { PLANS } from '@emealia/config';
import type { MacroTargets } from '@emealia/types';

type Vista = 'hoje' | 'objectivos' | 'historico';

function adicionarMeses(data: string, delta: number): string {
  const d = new Date(`${data}T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  return d.toISOString().slice(0, 10);
}

export default function MacrosScreen() {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id);
  const [vista, setVista] = useState<Vista>('hoje');

  const podeAceder = profile ? PLANS[profile.plano].features.macros : false;

  const [semanaInicio] = useState(segundaFeiraDaSemana());
  const { items } = usePlanner(user?.id, semanaInicio, podeAceder);
  const { items: favoritos } = useSavedRecipes(user?.id);
  const { macrosByDia } = usePlannerMacros(items, favoritos);
  const macrosHoje = macrosByDia[diaSemanaAtual()];

  const [periodoHistorico, setPeriodoHistorico] = useState<'semana' | 'mes'>('semana');
  const [dataReferenciaHistorico, setDataReferenciaHistorico] = useState(new Date().toISOString().slice(0, 10));
  const { dias, media, loading: historicoLoading } = useMacroHistory(user?.id, periodoHistorico, dataReferenciaHistorico);

  function handleNavegarPeriodo(direcao: 1 | -1) {
    setDataReferenciaHistorico((data) =>
      periodoHistorico === 'semana' ? adicionarSemanas(data, direcao) : adicionarMeses(data, direcao)
    );
  }

  const metas: MacroTargets = {
    meta_calorias:  profile?.meta_calorias ?? 0,
    meta_proteinas: profile?.meta_proteinas ?? 0,
    meta_hidratos:  profile?.meta_hidratos ?? 0,
    meta_gorduras:  profile?.meta_gorduras ?? 0,
  };

  const { alerta, diasExcedidos } = useMacroDeviationAlert(user?.id, profile?.meta_calorias ?? null, podeAceder);

  if (profileLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          Dashboard de Macros
        </Text>

        {!podeAceder ? (
          <PremiumLock mensagem="A contagem avançada de macros é uma funcionalidade Premium. Faz upgrade para desbloquear." />
        ) : (
          <>
            {alerta && <MacroDeviationAlert diasExcedidos={diasExcedidos} />}

            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              <Pill label="Hoje" selected={vista === 'hoje'} onPress={() => setVista('hoje')} />
              <Pill label="Objectivos" selected={vista === 'objectivos'} onPress={() => setVista('objectivos')} />
              <Pill label="Histórico" selected={vista === 'historico'} onPress={() => setVista('historico')} />
            </View>

            {vista === 'hoje' && (
              !profile?.meta_calorias ? (
                <View>
                  <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, marginBottom: spacing.md }}>
                    Ainda não definiste os teus objectivos nutricionais.
                  </Text>
                  <Button label="Define os teus objectivos primeiro" onPress={() => setVista('objectivos')} />
                </View>
              ) : (
                <MacroProgressSection
                  totais={macrosHoje?.totais ?? { calorias: 0, proteinas: 0, hidratos: 0, gorduras: 0 }}
                  metas={metas}
                  parcial={macrosHoje?.parcial ?? false}
                />
              )
            )}

            {vista === 'objectivos' && <MacroGoalsForm userId={user?.id} profile={profile} />}

            {vista === 'historico' && (
              <MacroHistoryView
                dataReferencia={dataReferenciaHistorico}
                periodo={periodoHistorico}
                onPeriodoChange={setPeriodoHistorico}
                onNavegarPeriodo={handleNavegarPeriodo}
                metas={metas}
                dias={dias}
                media={media}
                loading={historicoLoading}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
