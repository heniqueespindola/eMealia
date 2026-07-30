import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { BackButton } from '@/components/ui/BackButton';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { INGREDIENTES_COMUNS } from '@/constants/onboarding';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts } from '@/constants/theme';

export default function OnboardingStep2() {
  const { t } = useTranslation();
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
      <BackButton />

      <StepIndicator current={2} total={3} />

      <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
        {t('onboarding.step2Titulo')}
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textPrimary, textAlign: 'center', marginBottom: 32 }}>
        {t('onboarding.step2Subtitulo')}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        {INGREDIENTES_COMUNS.map((ingrediente) => (
          <Pill
            key={ingrediente.value}
            label={t(ingrediente.labelKey)}
            selected={selecionados.includes(ingrediente.value)}
            onPress={() => toggle(ingrediente.value)}
          />
        ))}
      </View>

      <Button label={t('common.proximo')} onPress={handleNext} disabled={selecionados.length < 3} />
    </ScrollView>
  );
}
