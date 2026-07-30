import type { Idioma, Momento } from '@emealia/types';
import { formatarData } from '@/i18n/formatDate';

export const DIAS_SEMANA = [
  'planner.dias.0', 'planner.dias.1', 'planner.dias.2', 'planner.dias.3',
  'planner.dias.4', 'planner.dias.5', 'planner.dias.6',
];

export const MOMENTOS: { value: Momento; labelKey: string }[] = [
  { value: 'pequeno_almoco', labelKey: 'planner.momentos.pequeno_almoco' },
  { value: 'almoco',         labelKey: 'planner.momentos.almoco' },
  { value: 'jantar',         labelKey: 'planner.momentos.jantar' },
  { value: 'lanche',         labelKey: 'planner.momentos.lanche' },
];

export function segundaFeiraDaSemana(base: Date = new Date()): string {
  const diaSemana = base.getDay();
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana;
  const segunda = new Date(base);
  segunda.setDate(base.getDate() + diff);
  return segunda.toISOString().slice(0, 10);
}

export function adicionarSemanas(semanaInicio: string, deltaSemanas: number): string {
  const data = new Date(`${semanaInicio}T00:00:00`);
  data.setDate(data.getDate() + deltaSemanas * 7);
  return data.toISOString().slice(0, 10);
}

export function formatarIntervaloSemana(semanaInicio: string, idioma: Idioma | null | undefined): string {
  const inicio = new Date(`${semanaInicio}T00:00:00`);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric' };
  return `${formatarData(inicio, idioma, opts)} – ${formatarData(fim, idioma, opts)}`;
}

export function dataDoSlot(semanaInicio: string, diaSemana: number): string {
  const data = new Date(`${semanaInicio}T00:00:00`);
  data.setDate(data.getDate() + diaSemana);
  return data.toISOString().slice(0, 10);
}

export function diaSemanaAtual(base: Date = new Date()): number {
  return base.getDay() === 0 ? 6 : base.getDay() - 1;
}
