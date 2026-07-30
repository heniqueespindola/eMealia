import { Platform } from 'react-native';
import type { HealthSyncAdapter } from './types';

export function getHealthAdapter(): HealthSyncAdapter | null {
  if (Platform.OS === 'ios') return require('./appleHealthAdapter').appleHealthAdapter;
  if (Platform.OS === 'android') return require('./healthConnectAdapter').healthConnectAdapter;
  return null;
}

export function plataformaSaudeAtual(): 'ios' | 'android' | null {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return null;
}
