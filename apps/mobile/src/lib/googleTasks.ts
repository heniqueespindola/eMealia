import Constants from 'expo-constants';

// Import nativo carregado de forma preguiçosa (lazy). Este pacote regista um
// Turbo Module a nível de módulo, o que rebenta imediatamente no Expo Go
// (não existe binário nativo lá). Usando require() dentro das funções em vez
// de um import estático no topo do ficheiro, o código só é avaliado quando a
// exportação é mesmo invocada — e nunca em Expo Go, porque bloqueamos isso primeiro.
function getGoogleSignin() {
  return require('@react-native-google-signin/google-signin').GoogleSignin;
}

const isExpoGo = Constants.appOwnership === 'expo';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  configured = true;
  const GoogleSignin = getGoogleSignin();
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    scopes: ['https://www.googleapis.com/auth/tasks'],
  });
}

export async function exportToGoogleTasks(items: { nome: string; quantidade: string | null }[]) {
  if (isExpoGo) {
    throw new Error(
      'Exportar para o Google Tasks requer uma development build (não funciona no Expo Go).'
    );
  }
  ensureConfigured();
  const GoogleSignin = getGoogleSignin();
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
