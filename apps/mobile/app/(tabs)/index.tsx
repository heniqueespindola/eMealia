import { useMemo, useState } from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useFeed } from '@/hooks/useFeed';
import { useFollowedCreators } from '@/hooks/useFollowedCreators';
import { useMacroDeviationAlert } from '@/hooks/useMacroDeviationAlert';
import { Pill } from '@/components/ui/Pill';
import { Button } from '@/components/ui/Button';
import { CarouselStrip } from '@/components/feed/CarouselStrip';
import { MacroDeviationAlert } from '@/components/macros/MacroDeviationAlert';
import { FEED_FILTER_OPTIONS } from '@/constants/feedFilters';
import { colors, fonts, spacing } from '@/constants/theme';
import { PLANS } from '@emealia/config';
import type { FiltroDietetico } from '@emealia/types';

export default function HomeScreen() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [filtroSelecionado, setFiltroSelecionado] = useState<FiltroDietetico | null>(null);
  const [vista, setVista] = useState<'descobrir' | 'a_seguir'>('descobrir');
  const filtrosPerfil = useMemo(() => profile?.filtros_dieteticos ?? [], [profile?.filtros_dieteticos]);
  const { channelIds } = useFollowedCreators(user?.id);
  const { videos, loading } = useFeed(filtroSelecionado ?? undefined, filtrosPerfil, vista === 'a_seguir' ? channelIds : undefined);
  const [activeIndex, setActiveIndex] = useState(0);

  const podeAcederMacros = profile ? PLANS[profile.plano].features.macros : false;
  const { alerta, diasExcedidos } = useMacroDeviationAlert(user?.id, profile?.meta_calorias ?? null, podeAcederMacros);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary }}>
          eMealia
        </Text>
        <Pressable onPress={() => router.push('/creators')}>
          <Ionicons name="people-circle-outline" size={28} color={colors.primary} />
        </Pressable>
      </View>

      {alerta && (
        <View style={{ paddingHorizontal: spacing.lg }}>
          <MacroDeviationAlert diasExcedidos={diasExcedidos} />
        </View>
      )}

      <View style={{ paddingHorizontal: spacing.lg, flexDirection: 'row', flexWrap: 'wrap' }}>
        <Pill label="Descobrir" selected={vista === 'descobrir'} onPress={() => setVista('descobrir')} />
        <Pill label="A seguir" selected={vista === 'a_seguir'} onPress={() => setVista('a_seguir')} />
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

      {vista === 'a_seguir' && channelIds.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.md }}>
          <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
            Ainda não segues nenhum criador.
          </Text>
          <Button label="Explorar Criadores em Destaque" onPress={() => router.push('/creators')} />
        </View>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <CarouselStrip key={`${vista}-${filtroSelecionado ?? 'todos'}`} videos={videos} onIndexChange={setActiveIndex} />
          )}
        </View>
      )}

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
