import type { Momento } from '@emealia/types';

export const DIAS_SEMANA = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const MOMENTOS: { value: Momento; label: string }[] = [
  { value: 'pequeno_almoco', label: 'Pequeno-almoço' },
  { value: 'almoco',         label: 'Almoço' },
  { value: 'jantar',         label: 'Jantar' },
  { value: 'lanche',         label: 'Lanche' },
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

export function formatarIntervaloSemana(semanaInicio: string): string {
  const inicio = new Date(`${semanaInicio}T00:00:00`);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  const fmt = (d: Date) => `${d.getDate()}/${d.getMonth() + 1}`;
  return `${fmt(inicio)} – ${fmt(fim)}`;
}

export function dataDoSlot(semanaInicio: string, diaSemana: number): string {
  const data = new Date(`${semanaInicio}T00:00:00`);
  data.setDate(data.getDate() + diaSemana);
  return data.toISOString().slice(0, 10);
}

export function diaSemanaAtual(base: Date = new Date()): number {
  return base.getDay() === 0 ? 6 : base.getDay() - 1;
}
