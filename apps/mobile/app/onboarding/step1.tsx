import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { OPCOES_PREFERENCIAS_DIETETICAS } from '@/constants/onboarding';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts } from '@/constants/theme';
import type { FiltroDietetico } from '@emealia/types';

export default function OnboardingStep1() {
  const { t } = useTranslation();
  const router = useRouter();
  const filtrosDieteticos = useOnboardingStore((s) => s.filtrosDieteticos);
  const [selecionados, setSelecionados] = useState<FiltroDietetico[]>(filtrosDieteticos);

  function toggle(value: FiltroDietetico) {
    setSelecionados((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleNext() {
    useOnboardingStore.getState().setFiltrosDieteticos(selecionados);
    router.push('/onboarding/step2');
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgLight }}
      contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
    >
      <StepIndicator current={1} total={3} />

      <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
        {t('onboarding.step1Titulo')}
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textPrimary, textAlign: 'center', marginBottom: 32 }}>
        {t('onboarding.step1Subtitulo')}
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        {OPCOES_PREFERENCIAS_DIETETICAS.map((opcao) => (
          <Pill
            key={opcao.value}
            label={t(`config.filtros.${opcao.value}`)}
            selected={selecionados.includes(opcao.value)}
            onPress={() => toggle(opcao.value)}
          />
        ))}
      </View>

      <Button label={t('common.proximo')} onPress={handleNext} />
    </ScrollView>
  );
}
