import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { INGREDIENTES_COMUNS } from '@/constants/onboarding';
import { colors, fonts } from '@/constants/theme';

export default function OnboardingStep2() {
  const router = useRouter();
  const ingredientesIniciais = useOnboardingStore((s) => s.ingredientesIniciais);
  const [selecionados, setSelecionados] = useState<string[]>(ingredientesIniciais);

  function toggle(nome: string) {
    setSelecionados((prev) =>
      prev.includes(nome) ? prev.filter((n) => n !== nome) : [...prev, nome]
    );
  }

  function handleNext() {
    useOnboardingStore.getState().setIngredientesIniciais(selecionados);
    router.push('/onboarding/step3');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgLight }}
      contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
    >
      <StepIndicator current={2} total={3} />

      <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
        Vamos conhecer a tua despensa
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textPrimary, textAlign: 'center', marginBottom: 32 }}>
        Selecciona pelo menos 3 ingredientes que costumas ter em casa. Podes adicionar mais tarde na tua despensa.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        {INGREDIENTES_COMUNS.map((nome) => (
          <Pill
            key={nome}
            label={nome}
            selected={selecionados.includes(nome)}
            onPress={() => toggle(nome)}
          />
        ))}
      </View>

      <Button label="Próximo" onPress={handleNext} disabled={selecionados.length < 3} />
    </ScrollView>
  );
}
