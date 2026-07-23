import { useMemo, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useFeed } from '@/hooks/useFeed';
import { Pill } from '@/components/ui/Pill';
import { CarouselStrip } from '@/components/feed/CarouselStrip';
import { FEED_FILTER_OPTIONS } from '@/constants/feedFilters';
import { colors, fonts, spacing } from '@/constants/theme';
import type { FiltroDietetico } from '@emealia/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [filtroSelecionado, setFiltroSelecionado] = useState<FiltroDietetico | null>(null);
  const filtrosPerfil = useMemo(() => profile?.filtros_dieteticos ?? [], [profile?.filtros_dieteticos]);
  const { videos, loading } = useFeed(filtroSelecionado ?? undefined, filtrosPerfil);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          eMealia
        </Text>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', flexWrap: 'wrap' }}>
        {FEED_FILTER_OPTIONS.map((opcao) => (
          <Pill
            key={opcao.label}
            label={opcao.label}
            selected={filtroSelecionado === opcao.value}
            onPress={() => {
              setFiltroSelecionado(opcao.value);
              setActiveIndex(0);
            }}
          />
        ))}
      </View>

      <View style={{ flex: 1, justifyContent: 'center' }}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <CarouselStrip key={filtroSelecionado ?? 'todos'} videos={videos} onIndexChange={setActiveIndex} />
        )}
      </View>

      <View style={{ flexDirection: 'row', justifyContent: 'center', paddingVertical: spacing.md }}>
        {videos.map((_, i) => (
          <View
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              marginHorizontal: 3,
              backgroundColor: i === activeIndex ? colors.primary : colors.border,
            }}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}
