import { View, Text } from 'react-native';
import { updateProfile } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import { useTranslation } from '@/hooks/useTranslation';
import { setLocale } from '@/i18n';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors, fonts, spacing } from '@/constants/theme';
import type { Idioma, Profile } from '@emealia/types';

interface LanguageSectionProps {
  profile: Profile;
}

const IDIOMAS: { value: Idioma; label: string }[] = [
  { value: 'pt-PT', label: 'Português' },
  { value: 'es-ES', label: 'Español' },
  { value: 'en',    label: 'English' },
];

export function LanguageSection({ profile }: LanguageSectionProps) {
  const { t } = useTranslation();

  async function selecionarIdioma(novoIdioma: Idioma) {
    setLocale(novoIdioma);
    const { data } = await updateProfile(supabase!, profile.id, { idioma: novoIdioma });
    if (data) useProfileStore.getState().setProfile(data);
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.primary, marginBottom: spacing.md }}>
        {t('profile.idioma')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {IDIOMAS.map((idioma) => (
          <Pill
            key={idioma.value}
            label={idioma.label}
            selected={profile.idioma === idioma.value}
            onPress={() => selecionarIdioma(idioma.value)}
          />
        ))}
      </View>
    </Card>
  );
}
