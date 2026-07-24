import { View, Text, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { usePantry } from '@/hooks/usePantry';
import { useMealPlanWeek } from '@/hooks/useMealPlanWeek';
import { useShoppingList } from '@/hooks/useShoppingList';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';

function segundaFeiraDaSemana(): string {
  const hoje = new Date();
  const diaSemana = hoje.getDay(); // 0=Domingo, 1=Segunda, ...
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() + diff);
  return segunda.toISOString().slice(0, 10);
}

export default function PlannerScreen() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { items: pantryItems } = usePantry(user?.id);
  const { fetchSemana } = useMealPlanWeek(user?.id);
  const { addFromSemana } = useShoppingList(user?.id);

  async function handleGerarListaSemana() {
    const semanaInicio = segundaFeiraDaSemana();
    const mealPlanItems = await fetchSemana(semanaInicio);
    if (mealPlanItems.length === 0) {
      Alert.alert('Ainda não tens receitas planeadas para esta semana');
      return;
    }
    const count = await addFromSemana(mealPlanItems, pantryItems);
    Alert.alert(count > 0 ? `${count} itens adicionados à lista` : 'Já tens tudo o que precisas em casa');
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ flex: 1, padding: spacing.lg }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary, marginBottom: spacing.lg }}>
          F09 — Planeamento semanal (Premium)
        </Text>

        <Button label="Gerar lista da semana" onPress={handleGerarListaSemana} disabled={!profile} />
      </View>
    </SafeAreaView>
  );
}
