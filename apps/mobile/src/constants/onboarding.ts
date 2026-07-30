import { FILTROS_DIETETICOS } from '@emealia/config';
import type { FiltroDietetico } from '@emealia/types';

const STEP1_VALUES: FiltroDietetico[] = ['vegan', 'vegetariano', 'sem_gluten', 'sem_lactose', 'airfryer', 'rapida'];
const STEP3_VALUES: FiltroDietetico[] = ['fria', 'sobremesa', 'pequeno_almoco'];

export const OPCOES_PREFERENCIAS_DIETETICAS = FILTROS_DIETETICOS.filter((f) => STEP1_VALUES.includes(f.value));
export const OPCOES_FILTROS_FAVORITOS       = FILTROS_DIETETICOS.filter((f) => STEP3_VALUES.includes(f.value));

export const INGREDIENTES_COMUNS: { value: string; labelKey: string }[] = [
  { value: 'Ovo',    labelKey: 'onboarding.opcoes.ingredientes.ovo' },
  { value: 'Massa',  labelKey: 'onboarding.opcoes.ingredientes.massa' },
  { value: 'Arroz',  labelKey: 'onboarding.opcoes.ingredientes.arroz' },
  { value: 'Tomate', labelKey: 'onboarding.opcoes.ingredientes.tomate' },
  { value: 'Cebola', labelKey: 'onboarding.opcoes.ingredientes.cebola' },
  { value: 'Alho',   labelKey: 'onboarding.opcoes.ingredientes.alho' },
  { value: 'Batata', labelKey: 'onboarding.opcoes.ingredientes.batata' },
  { value: 'Azeite', labelKey: 'onboarding.opcoes.ingredientes.azeite' },
  { value: 'Frango', labelKey: 'onboarding.opcoes.ingredientes.frango' },
  { value: 'Queijo', labelKey: 'onboarding.opcoes.ingredientes.queijo' },
  { value: 'Leite',  labelKey: 'onboarding.opcoes.ingredientes.leite' },
  { value: 'Pão',    labelKey: 'onboarding.opcoes.ingredientes.pao' },
];

export const OPCOES_FREQUENCIA_COZINHA: { value: number; labelKey: string }[] = [
  { value: 1, labelKey: 'onboarding.opcoes.frequencia.1' },
  { value: 3, labelKey: 'onboarding.opcoes.frequencia.3' },
  { value: 5, labelKey: 'onboarding.opcoes.frequencia.5' },
  { value: 7, labelKey: 'onboarding.opcoes.frequencia.7' },
];
