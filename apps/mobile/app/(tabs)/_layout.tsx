import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  const { session } = useAuth();
  const { profile } = useProfile(session?.user?.id);

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }
  if (!profile?.onboarding_completo) {
    return <Redirect href="/onboarding/step1" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bgDark, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index"    options={{ title: 'Início' }} />
      <Tabs.Screen name="search"   options={{ title: 'Pesquisar' }} />
      <Tabs.Screen name="pantry"   options={{ title: 'Despensa' }} />
      <Tabs.Screen name="planner"  options={{ title: 'Plano' }} />
      <Tabs.Screen name="profile"  options={{ title: 'Perfil' }} />
    </Tabs>
  );
}
