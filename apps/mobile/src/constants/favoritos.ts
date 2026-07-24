import { DEFAULT_COLECOES } from '@emealia/config';
import type { SavedRecipe } from '@emealia/types';

export interface ColecaoOption {
  value: string;
  label: string;
}

export function getColecoesDisponiveis(items: SavedRecipe[], customColecoes: string[]): ColecaoOption[] {
  const defaultValues = DEFAULT_COLECOES.map((c) => c.value as string);
  const distintos = new Set<string>();
  items.forEach((i) => distintos.add(i.colecao));
  customColecoes.forEach((c) => distintos.add(c));

  const extras: ColecaoOption[] = [...distintos]
    .filter((v) => !defaultValues.includes(v))
    .map((v) => ({ value: v, label: v }));

  return [...DEFAULT_COLECOES, ...extras];
}

export function isColecaoPadrao(value: string): boolean {
  return DEFAULT_COLECOES.some((c) => c.value === value);
}
