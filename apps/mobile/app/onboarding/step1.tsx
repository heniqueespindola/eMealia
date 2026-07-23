import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { OPCOES_PREFERENCIAS_DIETETICAS } from '@/constants/onboarding';
import { colors, fonts } from '@/constants/theme';
import type { FiltroDietetico } from '@emealia/types';

export default function OnboardingStep1() {
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
        Bem-vindo(a) à eMealia
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textPrimary, textAlign: 'center', marginBottom: 32 }}>
        Cozinha o que tens, descobre o que queres. Conta-nos as tuas preferências para te mostrarmos receitas à tua medida.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        {OPCOES_PREFERENCIAS_DIETETICAS.map((opcao) => (
          <Pill
            key={opcao.value}
            label={opcao.label}
            selected={selecionados.includes(opcao.value)}
            onPress={() => toggle(opcao.value)}
          />
        ))}
      </View>

      <Button label="Próximo" onPress={handleNext} />
    </ScrollView>
  );
}
