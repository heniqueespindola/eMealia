import type { ShoppingListItem } from '@emealia/types';

export function normalizarNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .replace(/s$/, '');
}

export function agruparPorComprado(items: ShoppingListItem[]) {
  return [
    { comprado: false, label: 'Por comprar', data: items.filter((i) => !i.comprado) },
    { comprado: true,  label: 'Comprados',   data: items.filter((i) => i.comprado) },
  ].filter((section) => section.data.length > 0);
}

export function consolidarIngredientes(
  ingredientes: { nome: string; quantidade: string | null }[]
): { nome: string; quantidade: string | null }[] {
  const vistos = new Map<string, { nome: string; quantidade: string | null }>();
  for (const ing of ingredientes) {
    const chave = normalizarNome(ing.nome);
    if (!vistos.has(chave)) vistos.set(chave, ing);
  }
  return [...vistos.values()];
}
