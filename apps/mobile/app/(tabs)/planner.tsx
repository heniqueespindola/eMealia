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
import { colors, fonts, spacing } from '@/constants/theme';
import { segundaFeiraDaSemana, adicionarSemanas } from '@/constants/planner';
import { PLANS } from '@emealia/config';

export default function PlannerScreen() {
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
      Alert.alert('Ainda não tens receitas planeadas para esta semana');
      return;
    }
    const count = await addFromSemana(items, pantryItems);
    const videosIgnorados = items.filter((i) => i.fonte && i.fonte !== 'spoonacular').length;

    let mensagem = count > 0 ? `${count} itens adicionados à lista` : 'Já tens tudo o que precisas em casa';
    if (videosIgnorados > 0) {
      mensagem += `\n\n${videosIgnorados} receita(s) de vídeo não têm ingredientes estruturados e não entraram na lista.`;
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
          Planeamento semanal
        </Text>

        {!podeAceder ? (
          <PremiumLock mensagem="O planeamento semanal de refeições é uma funcionalidade Premium. Faz upgrade para desbloquear." />
        ) : (
          <>
            <WeekNavigator
              semanaInicio={semanaInicio}
              onPrev={() => setSemanaInicio((s) => adicionarSemanas(s, -1))}
              onNext={() => setSemanaInicio((s) => adicionarSemanas(s, 1))}
            />

            {itemEmMovimento && (
              <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primary, marginBottom: spacing.sm }}>
                A mover &quot;{itemEmMovimento.titulo}&quot; — toca no slot de destino
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
              <Button label="Gerar lista da semana" onPress={handleGerarListaSemana} />
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
