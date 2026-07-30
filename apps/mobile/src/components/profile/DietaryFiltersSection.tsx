import { useState } from 'react';
import { View, Text } from 'react-native';
import { FILTROS_DIETETICOS } from '@emealia/config';
import { updateProfile } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/ui/Pill';
import { colors, fonts, spacing } from '@/constants/theme';
import type { FiltroDietetico, Profile } from '@emealia/types';

interface DietaryFiltersSectionProps {
  profile: Profile;
}

export function DietaryFiltersSection({ profile }: DietaryFiltersSectionProps) {
  const { t } = useTranslation();
  const [selecionados, setSelecionados] = useState<FiltroDietetico[]>(profile.filtros_dieteticos);

  async function toggleFiltro(value: FiltroDietetico) {
    const novosFiltros = selecionados.includes(value)
      ? selecionados.filter((v) => v !== value)
      : [...selecionados, value];
    setSelecionados(novosFiltros);
    const { data } = await updateProfile(supabase!, profile.id, { filtros_dieteticos: novosFiltros });
    if (data) useProfileStore.getState().setProfile(data);
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.primary, marginBottom: spacing.md }}>
        {t('profile.filtrosDieteticos')}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {FILTROS_DIETETICOS.map((f) => (
          <Pill
            key={f.value}
            label={t(`config.filtros.${f.value}`)}
            selected={selecionados.includes(f.value)}
            onPress={() => toggleFiltro(f.value)}
          />
        ))}
      </View>
    </Card>
  );
}
