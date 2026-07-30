import { Platform } from 'react-native';
import {
  getSdkStatus,
  initialize,
  insertRecords,
  MealType,
  requestPermission,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';
import type { MacroDailyTotal } from '@emealia/types';
import type { HealthSyncAdapter } from './types';

async function isDisponivel(): Promise<boolean> {
  if (Platform.OS !== 'android') return false;
  const status = await getSdkStatus();
  return status === SdkAvailabilityStatus.SDK_AVAILABLE;
}

async function pedirAutorizacao(): Promise<boolean> {
  await initialize();
  const concedidas = await requestPermission([{ accessType: 'write', recordType: 'Nutrition' }]);
  return concedidas.some((p) => p.accessType === 'write' && p.recordType === 'Nutrition');
}

async function exportarTotalDiario(total: MacroDailyTotal): Promise<void> {
  await initialize();
  // Meio-dia UTC de `total.data` evita ambiguidade de fuso horário: o dado é
  // um total diário, não um evento pontual, por isso startTime === endTime.
  const meioDia = new Date(`${total.data}T12:00:00Z`).toISOString();

  await insertRecords([
    {
      recordType: 'Nutrition',
      startTime: meioDia,
      endTime: meioDia,
      // Total diário agregado, não associado a uma refeição específica.
      mealType: MealType.UNKNOWN,
      energy: { value: total.calorias, unit: 'kilocalories' },
      protein: { value: total.proteinas, unit: 'grams' },
      totalCarbohydrate: { value: total.hidratos, unit: 'grams' },
      totalFat: { value: total.gorduras, unit: 'grams' },
    },
  ]);
}

export const healthConnectAdapter: HealthSyncAdapter = {
  isDisponivel,
  pedirAutorizacao,
  exportarTotalDiario,
};
