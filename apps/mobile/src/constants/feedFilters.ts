import type { FiltroDietetico } from '@emealia/types';

export interface FeedFilterOption {
  label: string;
  value: FiltroDietetico | null; // null = "Todos"
}

export const FEED_FILTER_OPTIONS: FeedFilterOption[] = [
  { label: 'Todos',      value: null },
  { label: 'Rápidas',    value: 'rapida' },
  { label: 'Vegan',      value: 'vegan' },
  { label: 'Airfryer',   value: 'airfryer' },
  { label: 'Sobremesas', value: 'sobremesa' },
];
