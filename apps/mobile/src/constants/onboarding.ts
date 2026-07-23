import { FILTROS_DIETETICOS } from '@emealia/config';
import type { FiltroDietetico } from '@emealia/types';

const STEP1_VALUES: FiltroDietetico[] = ['vegan', 'vegetariano', 'sem_gluten', 'sem_lactose', 'airfryer', 'rapida'];
const STEP3_VALUES: FiltroDietetico[] = ['fria', 'sobremesa', 'pequeno_almoco'];

export const OPCOES_PREFERENCIAS_DIETETICAS = FILTROS_DIETETICOS.filter((f) => STEP1_VALUES.includes(f.value));
export const OPCOES_FILTROS_FAVORITOS       = FILTROS_DIETETICOS.filter((f) => STEP3_VALUES.includes(f.value));

export const INGREDIENTES_COMUNS = [
  'Ovo', 'Massa', 'Arroz', 'Tomate', 'Cebola', 'Alho',
  'Batata', 'Azeite', 'Frango', 'Queijo', 'Leite', 'Pão',
];

export const OPCOES_FREQUENCIA_COZINHA = [
  { value: 1, label: '1x por semana' },
  { value: 3, label: '2-3x por semana' },
  { value: 5, label: '4-5x por semana' },
  { value: 7, label: 'Todos os dias' },
];
