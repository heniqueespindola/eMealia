import { useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer from 'react-native-youtube-iframe';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import type { VideoItem } from '@emealia/types';

interface VideoPlayerModalProps {
  visible: boolean;
  video: VideoItem | null;
  onClose: () => void;
}

// Mesma configuração já validada em VideoCard.tsx (homepage) — useLocalHTML
// + baseUrlOverride fora de youtube.com + play só depois de onReady. Aqui,
// ao contrário do cartão da homepage, mostramos os controlos nativos do
// YouTube (o utilizador escolheu ativamente ver este vídeo, faz sentido
// dar-lhe som/fullscreen/progresso em vez de escondermos tudo).
export function VideoPlayerModal({ visible, video, onClose }: VideoPlayerModalProps) {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  function handleClose() {
    setReady(false);
    setFailed(false);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: spacing.md,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
          }}
        >
          <Pressable
            onPress={handleClose}
            hitSlop={16}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.bgDarkAlt,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="close" size={26} color={colors.textInverted} />
          </Pressable>
        </View>

        {video && !failed && (
          <YoutubePlayer
            height={220}
            videoId={video.youtube_id}
            play={ready}
            mute
            useLocalHTML
            baseUrlOverride="https://lonelycpp.github.io"
            onReady={() => setReady(true)}
            onError={() => setFailed(true)}
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
          />
        )}

        {video && failed && (
          <View style={{ height: 220, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg }}>
            <Text style={{ fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' }}>
              {t('creators.videoIndisponivel')}
            </Text>
          </View>
        )}

        {video && (
          <View style={{ padding: spacing.lg }}>
            <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.textInverted }}>
              {video.titulo}
            </Text>
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: spacing.xs }}>
              {video.canal} · {video.duracao}
            </Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}
