import type { MacroDailyTotal } from '@emealia/types';

export interface HealthSyncAdapter {
  isDisponivel(): Promise<boolean>;
  pedirAutorizacao(): Promise<boolean>;
  exportarTotalDiario(total: MacroDailyTotal): Promise<void>;
}
