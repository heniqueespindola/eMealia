import type { FiltroDietetico } from '@emealia/types';

export interface FeedFilterOption {
  labelKey: string;
  value: FiltroDietetico | null; // null = "Todos"
}

export const FEED_FILTER_OPTIONS: FeedFilterOption[] = [
  { labelKey: 'feed.filtros.todos',      value: null },
  { labelKey: 'feed.filtros.rapidas',    value: 'rapida' },
  { labelKey: 'feed.filtros.vegan',      value: 'vegan' },
  { labelKey: 'feed.filtros.airfryer',   value: 'airfryer' },
  { labelKey: 'feed.filtros.sobremesas', value: 'sobremesa' },
];
