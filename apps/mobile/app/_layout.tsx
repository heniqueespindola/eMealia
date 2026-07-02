import { useEffect } from 'react';
import { Stack, useSegments, useRouter } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/hooks/useAuth';
import '../src/styles/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    'Inter-Regular':   require('../src/assets/fonts/Inter-Regular.ttf'),
    'Inter-Medium':    require('../src/assets/fonts/Inter-Medium.ttf'),
    'Inter-SemiBold':  require('../src/assets/fonts/Inter-SemiBold.ttf'),
    'Inter-Bold':      require('../src/assets/fonts/Inter-Bold.ttf'),
    'PlayfairDisplay-Bold': require('../src/assets/fonts/PlayfairDisplay-Bold.ttf'),
  });

  const { session, loading: authLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  const appReady = loaded && !authLoading;

  useEffect(() => {
    if (appReady) SplashScreen.hideAsync();
  }, [appReady]);

  useEffect(() => {
    if (!appReady) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [appReady, session, segments, router]);

  if (!appReady) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
