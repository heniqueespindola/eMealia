import * as Calendar from 'expo-calendar';

export async function exportToReminders(items: { nome: string; quantidade: string | null }[]) {
  const { status } = await Calendar.requestRemindersPermissionsAsync();
  if (status !== 'granted') return { success: false, error: 'Permissão de Lembretes negada' };

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.REMINDER);
  const defaultCalendar = calendars.find((c) => c.allowsModifications) ?? calendars[0];
  if (!defaultCalendar) return { success: false, error: 'Nenhum calendário de Lembretes disponível' };

  for (const item of items) {
    await Calendar.createReminderAsync(defaultCalendar.id, {
      title: item.quantidade ? `${item.nome} (${item.quantidade})` : item.nome,
    });
  }
  return { success: true, count: items.length };
}
