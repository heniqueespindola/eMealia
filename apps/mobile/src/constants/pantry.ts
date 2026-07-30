import type { CategoriaDespensa, PantryItem } from '@emealia/types';

export const CATEGORIAS_DESPENSA: { value: CategoriaDespensa; labelKey: string; icon: string }[] = [
  { value: 'frescos',    labelKey: 'pantry.categorias.frescos',    icon: 'leaf-outline' },
  { value: 'secos',      labelKey: 'pantry.categorias.secos',      icon: 'archive-outline' },
  { value: 'congelados', labelKey: 'pantry.categorias.congelados', icon: 'snow-outline' },
  { value: 'outros',     labelKey: 'pantry.categorias.outros',     icon: 'ellipsis-horizontal-outline' },
];

export const DIAS_ALERTA_VALIDADE = 3;

export function isExpiringSoon(expiraEm: string | null): boolean {
  if (!expiraEm) return false;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const diffDias = Math.ceil((new Date(expiraEm).getTime() - hoje.getTime()) / 86400000);
  return diffDias <= DIAS_ALERTA_VALIDADE;
}

export function agruparPorCategoria(items: PantryItem[]) {
  return CATEGORIAS_DESPENSA.map((cat) => ({
    categoria: cat.value,
    labelKey:  cat.labelKey,
    data:      items
      .filter((i) => i.categoria === cat.value)
      .sort((a, b) => {
        if (a.expira_em && b.expira_em) return a.expira_em.localeCompare(b.expira_em);
        if (a.expira_em) return -1;
        if (b.expira_em) return 1;
        return a.nome.localeCompare(b.nome);
      }),
  })).filter((section) => section.data.length > 0);
}
