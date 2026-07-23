import { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { StepIndicator } from '@/components/ui/StepIndicator';
import { BackButton } from '@/components/ui/BackButton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { updateProfile, addPantryItems } from '@emealia/supabase';
import { useOnboardingStore } from '@/stores/onboardingStore';
import { useProfileStore } from '@/stores/profileStore';
import { OPCOES_FILTROS_FAVORITOS, OPCOES_FREQUENCIA_COZINHA } from '@/constants/onboarding';
import { colors, fonts } from '@/constants/theme';
import type { FiltroDietetico } from '@emealia/types';

export default function OnboardingStep3() {
  const { user } = useAuth();
  const filtrosFavoritos  = useOnboardingStore((s) => s.filtrosFavoritos);
  const frequenciaCozinha = useOnboardingStore((s) => s.frequenciaCozinha);

  const [filtrosFavoritosSelecionados, setFiltrosFavoritosSelecionados] = useState<FiltroDietetico[]>(filtrosFavoritos);
  const [frequencia, setFrequencia] = useState<number | null>(frequenciaCozinha);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  function toggleFiltro(value: FiltroDietetico) {
    setFiltrosFavoritosSelecionados((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  async function handleConcluir() {
    if (frequencia === null) return;

    if (!user) {
      setError('Sessão expirada. Volta a fazer login e tenta novamente.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { filtrosDieteticos, ingredientesIniciais } = useOnboardingStore.getState();
      const filtrosUnidos = [...new Set([...filtrosDieteticos, ...filtrosFavoritosSelecionados])];

      const { data: updatedProfile, error: updateError } = await updateProfile(supabase!, user.id, {
        filtros_dieteticos:  filtrosUnidos,
        frequencia_cozinha:  frequencia,
        onboarding_completo: true,
      });

      if (updateError || !updatedProfile) {
        console.error('[onboarding] updateProfile falhou:', updateError);
        setError('Não foi possível guardar o teu perfil. Tenta novamente.');
        return;
      }

      if (ingredientesIniciais.length > 0) {
        const { error: pantryError } = await addPantryItems(supabase!, ingredientesIniciais.map((nome) => ({
          user_id: user.id, nome, quantidade: null, barcode: null, expira_em: null,
        })));
        if (pantryError) {
          console.error('[onboarding] addPantryItems falhou:', pantryError);
          // Não bloqueia o fluxo — a despensa pode ser preenchida mais tarde.
        }
      }

      console.log('[onboarding] profile atualizado com sucesso:', JSON.stringify(updatedProfile));
      useProfileStore.getState().setProfile(updatedProfile);
      useOnboardingStore.getState().reset();
      // Nota: não navegamos manualmente aqui. O _layout.tsx raiz observa
      // `profile.onboarding_completo` e o Stack.Protected redireciona para
      // '/(tabs)' automaticamente assim que o estado atualiza.
    } catch (err) {
      console.error('[onboarding] handleConcluir exceção:', err);
      setError('Não foi possível concluir o onboarding. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bgLight }}
      contentContainerStyle={{ flexGrow: 1, padding: 24, justifyContent: 'center' }}
    >
      <BackButton />

      <StepIndicator current={3} total={3} />

      <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
        Últimos detalhes
      </Text>
      <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textPrimary, textAlign: 'center', marginBottom: 24 }}>
        Escolhe os teus filtros favoritos e diz-nos com que frequência costumas cozinhar.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
        {OPCOES_FILTROS_FAVORITOS.map((opcao) => (
          <Pill
            key={opcao.value}
            label={opcao.label}
            selected={filtrosFavoritosSelecionados.includes(opcao.value)}
            onPress={() => toggleFiltro(opcao.value)}
          />
        ))}
      </View>

      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textPrimary, textAlign: 'center', marginBottom: 12 }}>
        Com que frequência costumas cozinhar?
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginBottom: 32 }}>
        {OPCOES_FREQUENCIA_COZINHA.map((opcao) => (
          <Pill
            key={opcao.value}
            label={opcao.label}
            selected={frequencia === opcao.value}
            onPress={() => setFrequencia(opcao.value)}
          />
        ))}
      </View>

      {error ? (
        <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.primaryDark, textAlign: 'center', marginBottom: 16 }}>
          {error}
        </Text>
      ) : null}

      <Button label="Concluir" onPress={handleConcluir} loading={loading} disabled={frequencia === null} />
    </ScrollView>
  );
}
