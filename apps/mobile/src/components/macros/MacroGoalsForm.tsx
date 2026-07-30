import { useState } from 'react';
import { View, Text } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { useMacroGoals } from '@/hooks/useMacroGoals';
import { NIVEIS_ACTIVIDADE, OBJECTIVOS_NUTRICIONAIS } from '@emealia/config';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Profile, Sexo, NivelActividade, ObjectivoNutricional } from '@emealia/types';

interface MacroGoalsFormProps {
  userId:  string | undefined;
  profile: Profile | null;
}

const SEXOS: { value: Sexo; label: string }[] = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino',  label: 'Feminino' },
];

export function MacroGoalsForm({ userId, profile }: MacroGoalsFormProps) {
  const { guardarObjectivos, saving } = useMacroGoals(userId);

  const [pesoKg, setPesoKg]     = useState(profile?.peso_kg ? String(profile.peso_kg) : '');
  const [alturaCm, setAlturaCm] = useState(profile?.altura_cm ? String(profile.altura_cm) : '');
  const [idade, setIdade]       = useState(profile?.idade ? String(profile.idade) : '');
  const [sexo, setSexo]         = useState<Sexo | null>(profile?.sexo ?? null);
  const [nivelActividade, setNivelActividade] = useState<NivelActividade | null>(profile?.nivel_actividade ?? null);
  const [objectivo, setObjectivo] = useState<ObjectivoNutricional | null>(profile?.objectivo_nutricional ?? null);

  const pesoNum   = Number(pesoKg);
  const alturaNum = Number(alturaCm);
  const idadeNum  = Number(idade);

  const valido =
    pesoNum > 0 && alturaNum > 0 && idadeNum > 0 &&
    sexo !== null && nivelActividade !== null && objectivo !== null;

  async function handleGuardar() {
    if (!valido || !sexo || !nivelActividade || !objectivo) return;
    await guardarObjectivos({
      peso_kg:               pesoNum,
      altura_cm:             alturaNum,
      idade:                 idadeNum,
      sexo,
      nivel_actividade:      nivelActividade,
      objectivo_nutricional: objectivo,
    });
  }

  return (
    <View>
      <Input label="Peso (kg)" value={pesoKg} onChangeText={setPesoKg} keyboardType="numeric" />
      <Input label="Altura (cm)" value={alturaCm} onChangeText={setAlturaCm} keyboardType="numeric" />
      <Input label="Idade" value={idade} onChangeText={setIdade} keyboardType="numeric" />

      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted, marginBottom: 6 }}>
        Sexo biológico
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
        {SEXOS.map((opcao) => (
          <Pill
            key={opcao.value}
            label={opcao.label}
            selected={sexo === opcao.value}
            onPress={() => setSexo(opcao.value)}
          />
        ))}
      </View>

      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted, marginBottom: 6 }}>
        Nível de actividade
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
        {NIVEIS_ACTIVIDADE.map((opcao) => (
          <Pill
            key={opcao.value}
            label={opcao.label}
            selected={nivelActividade === opcao.value}
            onPress={() => setNivelActividade(opcao.value)}
          />
        ))}
      </View>

      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted, marginBottom: 6 }}>
        Objectivo
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg }}>
        {OBJECTIVOS_NUTRICIONAIS.map((opcao) => (
          <Pill
            key={opcao.value}
            label={opcao.label}
            selected={objectivo === opcao.value}
            onPress={() => setObjectivo(opcao.value)}
          />
        ))}
      </View>

      <Button label="Guardar" onPress={handleGuardar} loading={saving} disabled={!valido} />
    </View>
  );
}
