import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { getMacroDailyTotals } from '@emealia/supabase';

export function useMacroDeviationAlert(userId: string | undefined, metaCalorias: number | null, enabled: boolean) {
  const [diasExcedidos, setDiasExcedidos] = useState(0);

  useEffect(() => {
    if (!userId || !enabled || !metaCalorias) { setDiasExcedidos(0); return; }

    const hoje = new Date();
    const fim = hoje.toISOString().slice(0, 10);
    const inicioDate = new Date(hoje);
    inicioDate.setDate(hoje.getDate() - 6);
    const inicio = inicioDate.toISOString().slice(0, 10);

    getMacroDailyTotals(supabase!, userId, inicio, fim).then(({ data, error }) => {
      if (error) { console.error('[useMacroDeviationAlert] falhou:', error); return; }
      setDiasExcedidos((data ?? []).filter((d) => d.calorias > metaCalorias).length);
    });
  }, [userId, metaCalorias, enabled]);

  return { alerta: diasExcedidos >= 4, diasExcedidos };
}
