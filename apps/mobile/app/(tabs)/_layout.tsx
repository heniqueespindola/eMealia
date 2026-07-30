import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
  const { t } = useTranslation();
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
      <Tabs.Screen name="index"      options={{ title: t('tabs.inicio') }} />
      <Tabs.Screen name="search"     options={{ title: t('tabs.pesquisar') }} />
      <Tabs.Screen name="favoritos"  options={{ title: t('tabs.favoritos') }} />
      <Tabs.Screen name="pantry"     options={{ title: t('tabs.despensa') }} />
      <Tabs.Screen name="planner"    options={{ title: t('tabs.plano') }} />
      <Tabs.Screen name="profile"    options={{ title: t('tabs.perfil') }} />
    </Tabs>
  );
}
