import { DEFAULT_COLECOES } from '@emealia/config';
import type { SavedRecipe } from '@emealia/types';

export interface ColecaoOption {
  value: string;
  labelKey?: string; // presente para coleções pré-definidas (chave de tradução)
  label?: string;    // presente para coleções personalizadas (texto livre do utilizador)
}

export function getColecoesDisponiveis(items: SavedRecipe[], customColecoes: string[]): ColecaoOption[] {
  const defaultValues = DEFAULT_COLECOES.map((c) => c.value as string);
  const distintos = new Set<string>();
  items.forEach((i) => distintos.add(i.colecao));
  customColecoes.forEach((c) => distintos.add(c));

  const extras: ColecaoOption[] = [...distintos]
    .filter((v) => !defaultValues.includes(v))
    .map((v) => ({ value: v, label: v }));

  const defaults: ColecaoOption[] = DEFAULT_COLECOES.map((c) => ({
    value:    c.value,
    labelKey: `config.colecoes.${c.value}`,
  }));

  return [...defaults, ...extras];
}

export function isColecaoPadrao(value: string): boolean {
  return DEFAULT_COLECOES.some((c) => c.value === value);
}
