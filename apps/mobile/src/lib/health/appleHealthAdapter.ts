import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  saveQuantitySample,
} from '@kingstinct/react-native-healthkit';
import type { MacroDailyTotal } from '@emealia/types';
import type { HealthSyncAdapter } from './types';

// Tipos de escrita nutricionais do HealthKit necessários para exportar um total diário.
const TIPOS_MACROS_ESCRITA = [
  'HKQuantityTypeIdentifierDietaryEnergyConsumed',
  'HKQuantityTypeIdentifierDietaryProtein',
  'HKQuantityTypeIdentifierDietaryCarbohydrates',
  'HKQuantityTypeIdentifierDietaryFatTotal',
] as const;

async function isDisponivel(): Promise<boolean> {
  return Platform.OS === 'ios' && isHealthDataAvailable();
}

async function pedirAutorizacao(): Promise<boolean> {
  return requestAuthorization({ toShare: TIPOS_MACROS_ESCRITA });
}

async function exportarTotalDiario(total: MacroDailyTotal): Promise<void> {
  // Meio-dia UTC de `total.data` evita ambiguidade de fuso horário: o dado é
  // um total diário, não um evento pontual, por isso start === end.
  const meioDia = new Date(`${total.data}T12:00:00Z`);

  await Promise.all([
    saveQuantitySample('HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal', total.calorias, meioDia, meioDia),
    saveQuantitySample('HKQuantityTypeIdentifierDietaryProtein', 'g', total.proteinas, meioDia, meioDia),
    saveQuantitySample('HKQuantityTypeIdentifierDietaryCarbohydrates', 'g', total.hidratos, meioDia, meioDia),
    saveQuantitySample('HKQuantityTypeIdentifierDietaryFatTotal', 'g', total.gorduras, meioDia, meioDia),
  ]);
}

export const appleHealthAdapter: HealthSyncAdapter = {
  isDisponivel,
  pedirAutorizacao,
  exportarTotalDiario,
};
