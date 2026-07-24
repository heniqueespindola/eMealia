import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  scopes: ['https://www.googleapis.com/auth/tasks'],
});

export async function exportToGoogleTasks(items: { nome: string; quantidade: string | null }[]) {
  await GoogleSignin.hasPlayServices();
  await GoogleSignin.signIn();
  const { accessToken } = await GoogleSignin.getTokens();

  for (const item of items) {
    await fetch('https://tasks.googleapis.com/tasks/v1/lists/@default/tasks', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.quantidade ? `${item.nome} (${item.quantidade})` : item.nome }),
    });
  }
  return { success: true, count: items.length };
}
