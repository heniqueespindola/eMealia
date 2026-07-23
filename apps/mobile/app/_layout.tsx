import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import '../src/styles/global.css';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    PlayfairDisplay_700Bold,
  });

  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useProfile(session?.user?.id);
  const segments = useSegments();
  const router = useRouter();

  const authReady = fontsLoaded && !authLoading && (!session || !profileLoading);

  useEffect(() => {
    if (!authReady) return;

    const inAuthGroup   = segments[0] === '(auth)';
    const inOnboarding  = segments[0] === 'onboarding';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && !profile?.onboarding_completo && !inOnboarding) {
      router.replace('/onboarding/step1');
    } else if (session && profile?.onboarding_completo && (inAuthGroup || inOnboarding)) {
      router.replace('/(tabs)');
    }
  }, [authReady, session, profile, segments]);

  useEffect(() => {
    if (authReady) SplashScreen.hideAsync();
  }, [authReady]);

  if (!authReady) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}
