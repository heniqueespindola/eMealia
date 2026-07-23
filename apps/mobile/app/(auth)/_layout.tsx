import { Stack, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';

export default function AuthLayout() {
  const { session } = useAuth();
  const { profile } = useProfile(session?.user?.id);

  // Se já há sessão, não faz sentido mostrar login/registo — manda para o
  // sítio certo consoante o estado do onboarding.
  if (session) {
    return <Redirect href={profile?.onboarding_completo ? '/(tabs)' : '/onboarding/step1'} />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
