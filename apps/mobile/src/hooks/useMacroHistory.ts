import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMacroDailyTotals } from '@emealia/supabase';
import { segundaFeiraDaSemana } from '@/constants/planner';
import type { MacroDailyTotal, MacroNutrients } from '@emealia/types';

const VAZIO: MacroNutrients = { calorias: 0, proteinas: 0, hidratos: 0, gorduras: 0 };

function intervaloDoPeriodo(periodo: 'semana' | 'mes', dataReferencia: string) {
  const base = new Date(`${dataReferencia}T00:00:00`);
  if (periodo === 'semana') {
    const inicio = segundaFeiraDaSemana(base);
    const fimDate = new Date(`${inicio}T00:00:00`);
    fimDate.setDate(fimDate.getDate() + 6);
    return { inicio, fim: fimDate.toISOString().slice(0, 10) };
  }
  const inicioDate = new Date(base.getFullYear(), base.getMonth(), 1);
  const fimDate = new Date(base.getFullYear(), base.getMonth() + 1, 0);
  return { inicio: inicioDate.toISOString().slice(0, 10), fim: fimDate.toISOString().slice(0, 10) };
}

export function useMacroHistory(userId: string | undefined, periodo: 'semana' | 'mes', dataReferencia: string) {
  const [dias, setDias] = useState<MacroDailyTotal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    const { inicio, fim } = intervaloDoPeriodo(periodo, dataReferencia);
    getMacroDailyTotals(supabase!, userId, inicio, fim).then(({ data, error }) => {
      if (error) console.error('[useMacroHistory] getMacroDailyTotals falhou:', error);
      setDias(data ?? []);
      setLoading(false);
    });
  }, [userId, periodo, dataReferencia]);

  const media = dias.length
    ? dias.reduce<MacroNutrients>((acc, d) => ({
        calorias:  acc.calorias  + d.calorias  / dias.length,
        proteinas: acc.proteinas + d.proteinas / dias.length,
        hidratos:  acc.hidratos  + d.hidratos  / dias.length,
        gorduras:  acc.gorduras  + d.gorduras  / dias.length,
      }), { ...VAZIO })
    : VAZIO;

  return { dias, media, loading };
}
