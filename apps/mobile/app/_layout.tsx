import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { PlayfairDisplay_700Bold } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { configurePurchases } from '@/lib/revenuecat';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { useSyncManager } from '@/hooks/useSyncManager';
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

  useEffect(() => {
    configurePurchases();
  }, []);

  const { session, loading: authLoading } = useAuth();
  const { loading: profileLoading } = useProfile(session?.user?.id);
  useSyncManager(session?.user?.id);

  const authReady = fontsLoaded && !authLoading && (!session || !profileLoading);

  useEffect(() => {
    if (authReady) SplashScreen.hideAsync();
  }, [authReady]);

  if (!authReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OfflineBanner />
      <Stack screenOptions={{ headerShown: false }} />
    </GestureHandlerRootView>
  );
}
