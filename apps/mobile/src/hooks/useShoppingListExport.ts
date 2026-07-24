import { Platform } from 'react-native';
import { useState } from 'react';
import { exportToReminders } from '@/lib/reminders';
import { exportToGoogleTasks } from '@/lib/googleTasks';

export function useShoppingListExport() {
  const [loading, setLoading] = useState(false);

  async function exportItems(items: { nome: string; quantidade: string | null }[]) {
    setLoading(true);
    const result = Platform.OS === 'ios' ? await exportToReminders(items) : await exportToGoogleTasks(items);
    setLoading(false);
    return result;
  }

  return { exportItems, loading };
}
