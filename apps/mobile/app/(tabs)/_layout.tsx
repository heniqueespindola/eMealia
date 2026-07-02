import { Tabs } from 'expo-router';
import { colors } from '@/constants/theme';

export default function TabsLayout() {
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
