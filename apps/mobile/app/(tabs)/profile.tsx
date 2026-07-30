import { Text, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useTranslation } from '@/hooks/useTranslation';
import { ProfileInfoSection } from '@/components/profile/ProfileInfoSection';
import { DietaryFiltersSection } from '@/components/profile/DietaryFiltersSection';
import { LanguageSection } from '@/components/profile/LanguageSection';
import { NotificationPrefsSection } from '@/components/profile/NotificationPrefsSection';
import { PlanSection } from '@/components/profile/PlanSection';
import { HealthSyncSection } from '@/components/health/HealthSyncSection';
import { PrivacySection } from '@/components/profile/PrivacySection';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const { profile, loading } = useProfile(user?.id);

  function confirmarLogout() {
    Alert.alert(t('profile.terminarSessaoTitulo'), t('profile.terminarSessaoMensagem'), [
      { text: t('common.cancelar'), style: 'cancel' },
      {
        text: t('profile.terminarSessao'),
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  if (loading || !profile || !user) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary, marginBottom: spacing.md }}>
          {t('profile.titulo')}
        </Text>

        <ProfileInfoSection profile={profile} />
        <DietaryFiltersSection profile={profile} />
        <LanguageSection profile={profile} />
        <NotificationPrefsSection profile={profile} />
        <PlanSection userId={user.id} profile={profile} />
        <HealthSyncSection profile={profile} />
        <PrivacySection userId={user.id} />

        <Button label={t('profile.terminarSessao')} variant="outline" onPress={confirmarLogout} />
      </ScrollView>
    </SafeAreaView>
  );
}
