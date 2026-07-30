import { useState } from 'react';
import { View, Text } from 'react-native';
import { updateProfile } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { AvatarPicker } from './AvatarPicker';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Profile } from '@emealia/types';

interface ProfileInfoSectionProps {
  profile: Profile;
}

export function ProfileInfoSection({ profile }: ProfileInfoSectionProps) {
  const { t } = useTranslation();
  const [nome, setNome] = useState(profile.nome ?? '');

  async function handleGuardarNome() {
    if (nome === (profile.nome ?? '')) return;
    const { data } = await updateProfile(supabase!, profile.id, { nome });
    if (data) useProfileStore.getState().setProfile(data);
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.primary, marginBottom: spacing.md }}>
        {t('profile.seccaoPerfil')}
      </Text>

      <AvatarPicker userId={profile.id} avatarUrl={profile.avatar_url} />

      <Input
        label={t('profile.nomeLabel')}
        value={nome}
        onChangeText={setNome}
        onBlur={handleGuardarNome}
      />

      <View>
        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted, marginBottom: 6 }}>
          {t('profile.emailLabel')}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textMuted }}>
          {profile.email}
        </Text>
      </View>
    </Card>
  );
}
