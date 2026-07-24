import type { CategoriaDespensa, PantryItem } from '@emealia/types';

export const CATEGORIAS_DESPENSA: { value: CategoriaDespensa; label: string; icon: string }[] = [
  { value: 'frescos',    label: 'Frescos',    icon: 'leaf-outline' },
  { value: 'secos',      label: 'Secos',      icon: 'archive-outline' },
  { value: 'congelados', label: 'Congelados', icon: 'snow-outline' },
  { value: 'outros',     label: 'Outros',     icon: 'ellipsis-horizontal-outline' },
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
    label:     cat.label,
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
