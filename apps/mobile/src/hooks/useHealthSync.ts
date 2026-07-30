import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { updateHealthSyncPrefs, getMacroDailyTotals } from '@emealia/supabase';
import { getHealthAdapter } from '@/lib/health';
import type { Profile } from '@emealia/types';

function hoje(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useHealthSync(profile: Profile | null) {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!profile || !profile.sync_saude_activo || !supabase) return;
    const jaSincronizadoHoje = profile.sync_saude_ultimo_em?.slice(0, 10) === hoje();
    if (jaSincronizadoHoje || syncingRef.current) return;

    const adapter = getHealthAdapter();
    if (!adapter) return;

    syncingRef.current = true;
    (async () => {
      const dataHoje = hoje();
      const { data: totais } = await getMacroDailyTotals(supabase!, profile.id, dataHoje, dataHoje);
      const totalHoje = totais?.[0];
      if (totalHoje) await adapter.exportarTotalDiario(totalHoje);

      await updateHealthSyncPrefs(supabase!, profile.id, { sync_saude_ultimo_em: new Date().toISOString() });
    })().finally(() => { syncingRef.current = false; });
  }, [profile?.id, profile?.sync_saude_activo, profile?.sync_saude_ultimo_em]);
}
