import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export default function OnboardingLayout() {
  const { session } = useAuth();
  const { profile } = useProfile(session?.user?.id);

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }
  if (profile?.onboarding_completo) {
    return <Redirect href="/(tabs)" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
