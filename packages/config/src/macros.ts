import type { MacroGoalsInput, MacroTargets, NivelActividade, ObjectivoNutricional } from '@emealia/types';

export const ACTIVITY_FACTORS: Record<NivelActividade, number> = {
  sedentario:     1.2,
  ligeiro:        1.375,
  moderado:       1.55,
  intenso:        1.725,
  muito_intenso:  1.9,
};

export const OBJECTIVE_ADJUSTMENTS: Record<ObjectivoNutricional, number> = {
  perda:       0.8,
  manutencao:  1.0,
  ganho:       1.1,
};

export const NIVEIS_ACTIVIDADE: { value: NivelActividade; label: string }[] = [
  { value: 'sedentario',    label: 'Sedentário (pouco ou nenhum exercício)' },
  { value: 'ligeiro',       label: 'Ligeiro (exercício 1-3x/semana)' },
  { value: 'moderado',      label: 'Moderado (exercício 3-5x/semana)' },
  { value: 'intenso',       label: 'Intenso (exercício 6-7x/semana)' },
  { value: 'muito_intenso', label: 'Muito intenso (atleta, 2x/dia)' },
];

export const OBJECTIVOS_NUTRICIONAIS: { value: ObjectivoNutricional; label: string }[] = [
  { value: 'perda',      label: 'Perda de peso' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'ganho',      label: 'Ganho de peso' },
];

const PROTEINA_G_POR_KG = 2;
const GORDURA_PERCENT_CALORIAS = 0.25;

export function calcularObjectivosDiarios(input: MacroGoalsInput): MacroTargets {
  const tmb = input.sexo === 'masculino'
    ? 10 * input.peso_kg + 6.25 * input.altura_cm - 5 * input.idade + 5
    : 10 * input.peso_kg + 6.25 * input.altura_cm - 5 * input.idade - 161;

  const tdee = tmb * ACTIVITY_FACTORS[input.nivel_actividade];
  const metaCalorias = Math.round(tdee * OBJECTIVE_ADJUSTMENTS[input.objectivo_nutricional]);

  const metaProteinas = Math.round(input.peso_kg * PROTEINA_G_POR_KG);
  const metaGorduras  = Math.round((metaCalorias * GORDURA_PERCENT_CALORIAS) / 9);
  const caloriasRestantes = Math.max(metaCalorias - metaProteinas * 4 - metaGorduras * 9, 0);
  const metaHidratos = Math.round(caloriasRestantes / 4);

  return {
    meta_calorias:  metaCalorias,
    meta_proteinas: metaProteinas,
    meta_hidratos:  metaHidratos,
    meta_gorduras:  metaGorduras,
  };
}
