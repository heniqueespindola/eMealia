import { View, Text } from 'react-native';
import { updateProfile } from '@emealia/supabase';
import { PLANS } from '@emealia/config';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { colors, fonts, spacing } from '@/constants/theme';
import type { NotificacoesPrefs, Profile } from '@emealia/types';

interface NotificationPrefsSectionProps {
  profile: Profile;
}

export function NotificationPrefsSection({ profile }: NotificationPrefsSectionProps) {
  const { t } = useTranslation();

  async function toggleNotif(chave: keyof NotificacoesPrefs, valor: boolean) {
    const novo = { ...profile.notificacoes_prefs, [chave]: valor };
    const { data } = await updateProfile(supabase!, profile.id, { notificacoes_prefs: novo });
    if (data) useProfileStore.getState().setProfile(data);
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.primary, marginBottom: spacing.md }}>
        {t('profile.notificacoes')}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textInverted }}>
          {t('profile.notifSugestoesJantar')}
        </Text>
        <Switch
          value={profile.notificacoes_prefs.sugestoes_jantar}
          onValueChange={(v) => toggleNotif('sugestoes_jantar', v)}
        />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textInverted }}>
          {t('profile.notifAlertasDespensa')}
        </Text>
        <Switch
          value={profile.notificacoes_prefs.alertas_despensa}
          onValueChange={(v) => toggleNotif('alertas_despensa', v)}
        />
      </View>

      {PLANS[profile.plano].features.planeamento_semanal && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textInverted }}>
            {t('profile.notifLembretePlaneamento')}
          </Text>
          <Switch
            value={profile.notificacoes_prefs.lembrete_planeamento}
            onValueChange={(v) => toggleNotif('lembrete_planeamento', v)}
          />
        </View>
      )}
    </Card>
  );
}
