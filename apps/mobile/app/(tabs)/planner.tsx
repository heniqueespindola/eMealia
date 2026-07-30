import { useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePantry } from '@/hooks/usePantry';
import { usePlanner } from '@/hooks/usePlanner';
import { usePlannerMacros } from '@/hooks/usePlannerMacros';
import { useMacroDailyTotalsSync } from '@/hooks/useMacroDailyTotalsSync';
import { useSavedRecipes } from '@/hooks/useSavedRecipes';
import { useShoppingList } from '@/hooks/useShoppingList';
import { usePlannerScreenState } from '@/hooks/usePlannerScreenState';
import { PremiumLock } from '@/components/paywall/PremiumLock';
import { WeekNavigator } from '@/components/planner/WeekNavigator';
import { PlannerGrid } from '@/components/planner/PlannerGrid';
import { PlannerRecipePickerModal } from '@/components/planner/PlannerRecipePickerModal';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import { segundaFeiraDaSemana, adicionarSemanas } from '@/constants/planner';
import { PLANS } from '@emealia/config';

export default function PlannerScreen() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id);
  const [semanaInicio, setSemanaInicio] = useState(segundaFeiraDaSemana());

  const podeAceder = profile ? PLANS[profile.plano].features.planeamento_semanal : false;
  const podeAcederMacros = profile ? PLANS[profile.plano].features.macros : false;

  const { items: pantryItems } = usePantry(user?.id);
  const { items: favoritos } = useSavedRecipes(user?.id);
  const { items, loading, assignSlot, moveSlot, removeSlot } = usePlanner(user?.id, semanaInicio, podeAceder);
  const { macrosByDia } = usePlannerMacros(items, favoritos);
  useMacroDailyTotalsSync(user?.id, semanaInicio, items, favoritos, podeAcederMacros);
  const { addFromSemana } = useShoppingList(user?.id);

  const { itemEmMovimento, slotAlvo, handleSlotPress, handleTrocar, handleSelecionarReceita, fecharModal } =
    usePlannerScreenState({ assignSlot, moveSlot });

  async function handleGerarListaSemana() {
    if (items.length === 0) {
      Alert.alert(t('planner.semReceitas'));
      return;
    }
    const count = await addFromSemana(items, pantryItems);
    const videosIgnorados = items.filter((i) => i.fonte && i.fonte !== 'spoonacular').length;

    let mensagem = count > 0 ? t('favoritos.itensAdicionados', { count }) : t('favoritos.tudoEmCasa');
    if (videosIgnorados > 0) {
      mensagem += `\n\n${t('planner.videosIgnorados', { count: videosIgnorados })}`;
    }
    Alert.alert(mensagem);
  }

  if (profileLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark, justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ flex: 1, padding: spacing.lg }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary, marginBottom: spacing.lg }}>
          {t('planner.titulo')}
        </Text>

        {!podeAceder ? (
          <PremiumLock mensagem={t('planner.premiumBloqueio')} />
        ) : (
          <>
            <WeekNavigator
              semanaInicio={semanaInicio}
              onPrev={() => setSemanaInicio((s) => adicionarSemanas(s, -1))}
              onNext={() => setSemanaInicio((s) => adicionarSemanas(s, 1))}
            />

            {itemEmMovimento && (
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary, marginBottom: spacing.sm }}>
                {t('planner.aMover', { titulo: itemEmMovimento.titulo })}
              </Text>
            )}

            {loading ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={{ flex: 1 }}>
                <PlannerGrid
                  items={items}
                  macrosByDia={macrosByDia}
                  itemEmMovimento={itemEmMovimento}
                  onSlotPress={handleSlotPress}
                  onRemove={(item) => removeSlot(item.id)}
                  onTrocar={handleTrocar}
                />
              </View>
            )}

            <View style={{ marginTop: spacing.md }}>
              <Button label={t('planner.gerarLista')} onPress={handleGerarListaSemana} />
            </View>

            <PlannerRecipePickerModal
              visible={!!slotAlvo}
              favoritos={favoritos}
              pantryItems={pantryItems}
              onSelect={handleSelecionarReceita}
              onClose={fecharModal}
            />
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
