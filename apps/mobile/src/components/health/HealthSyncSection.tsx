import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { updateHealthSyncPrefs } from '@emealia/supabase';
import { PLANS } from '@emealia/config';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import { useHealthSync } from '@/hooks/useHealthSync';
import { getHealthAdapter, plataformaSaudeAtual } from '@/lib/health';
import { useTranslation } from '@/hooks/useTranslation';
import { formatarData } from '@/i18n/formatDate';
import { PremiumLock } from '@/components/paywall/PremiumLock';
import { Card } from '@/components/ui/Card';
import { Switch } from '@/components/ui/Switch';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Profile } from '@emealia/types';

interface HealthSyncSectionProps {
  profile: Profile;
}

export function HealthSyncSection({ profile }: HealthSyncSectionProps) {
  const { t } = useTranslation();
  const [processing, setProcessing] = useState(false);

  useHealthSync(profile);

  const podeAceder = PLANS[profile.plano].features.sync_saude;
  const plataforma = plataformaSaudeAtual();

  async function toggleSync(valor: boolean) {
    if (processing) return;
    setProcessing(true);
    try {
      if (valor) {
        const autorizado = await getHealthAdapter()?.pedirAutorizacao();
        if (!autorizado) {
          Alert.alert(t('common.erro'), t('healthSync.autorizacaoNegada'));
          return;
        }
        const { data } = await updateHealthSyncPrefs(supabase!, profile.id, {
          sync_saude_activo:     true,
          sync_saude_plataforma: plataforma,
        });
        if (data) useProfileStore.getState().setProfile(data);
      } else {
        const { data } = await updateHealthSyncPrefs(supabase!, profile.id, { sync_saude_activo: false });
        if (data) useProfileStore.getState().setProfile(data);
      }
    } finally {
      setProcessing(false);
    }
  }

  if (!podeAceder) {
    return <PremiumLock mensagem={t('healthSync.premiumBloqueio')} />;
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.primary, marginBottom: spacing.md }}>
        {t('healthSync.titulo')}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.textInverted }}>
          {plataforma ? t('healthSync.plataforma', { plataforma: t(`healthSync.plataformas.${plataforma}`) }) : ''}
        </Text>
        <Switch value={profile.sync_saude_activo} onValueChange={toggleSync} />
      </View>

      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted }}>
        {profile.sync_saude_ultimo_em
          ? t('healthSync.ultimoSync', { data: formatarData(new Date(profile.sync_saude_ultimo_em), profile.idioma) })
          : t('healthSync.nuncaSincronizado')}
      </Text>
    </Card>
  );
}
