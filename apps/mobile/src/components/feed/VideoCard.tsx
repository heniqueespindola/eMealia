import { useEffect, useState } from 'react';
import { Pressable, Image, View, Text, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import YoutubePlayer, { PLAYER_STATES } from 'react-native-youtube-iframe';
import { colors, fonts, radius } from '@/constants/theme';
import { SourceBadge } from '@/components/feed/SourceBadge';
import type { VideoItem } from '@emealia/types';

interface VideoCardProps {
  video: VideoItem;
  width: number;
  height: number;
  isActive: boolean;
  onPress: () => void;
  onEnded?: () => void;
}

export function VideoCard({ video, width, height, isActive, onPress, onEnded }: VideoCardProps) {
  // A biblioteca só envia o comando "play" ao player depois de ele
  // reportar via onReady que está pronto — pedir play logo no primeiro
  // render (antes disso) pode perder-se e o vídeo fica parado no botão
  // do YouTube. Só marcamos `ready` quando o próprio player o confirma.
  const [ready, setReady] = useState(false);
  // Erro 153 do YouTube = o iframe não tem uma origem https:// válida
  // associada (acontece com useLocalHTML sem baseUrlOverride). Se mesmo
  // assim o player falhar (ex: vídeo com embedding desativado pelo dono
  // do canal — sim, isso acontece e não há como contornar), caímos de
  // volta para a thumbnail em vez de mostrar o erro cru do YouTube.
  const [playerFailed, setPlayerFailed] = useState(false);
  // Toque no cartão já ativo alterna play/pause em vez de tentar
  // "selecionar" um cartão que já está selecionado.
  const [playing, setPlaying] = useState(true);

  // video_cache só guarda vídeos do YouTube hoje (ver comentário em
  // packages/types/src/feed.ts) — `fonte` só existe nos vídeos mock
  // (TikTok/Instagram) usados como placeholder antes de haver dados reais.
  // Não há forma prática de reproduzir TikTok/Instagram embutido na app
  // sem os SDKs próprios deles, por isso o player real só entra aqui.
  const isYoutube = !video.fonte || video.fonte === 'youtube';
  const showPlayer = isActive && isYoutube && !playerFailed;

  useEffect(() => {
    // O player desmonta quando o cartão deixa de estar ativo (showPlayer
    // passa a false); ao voltar a ficar ativo monta-se uma instância nova,
    // que precisa de esperar pelo seu próprio onReady outra vez, e volta
    // a começar a tocar (não fica pausado de uma visita anterior).
    if (!isActive) {
      setReady(false);
      setPlaying(true);
    }
  }, [isActive]);

  // O vídeo do YouTube é 16:9 (paisagem); o cartão é vertical (tipo
  // TikTok). Para preencher o cartão sem barras pretas ("cover", como
  // Image resizeMode="cover"), sobredimensionamos a largura do player
  // para que a ALTURA renderizada cubra o cartão inteiro, e cortamos o
  // excesso horizontal centrando-o dentro de um container com overflow
  // escondido.
  const playerHeight = height;
  const playerWidth  = Math.round(height * (16 / 9));
  const playerOffsetX = (width - playerWidth) / 2;

  function handleOpenOnYoutube() {
    Linking.openURL(`https://www.youtube.com/watch?v=${video.youtube_id}`).catch((err) =>
    );
  }

  function handleCardPress() {
    // Cartão já ativo -> o toque alterna play/pause. Cartão ao lado ->
    // o toque seleciona-o (comportamento antigo, controlado pelo pai).
    if (isActive && ready) {
      setPlaying((p) => !p);
    } else {
      onPress();
    }
  }

  return (
    <Pressable
      onPress={handleCardPress}
      style={{
        width,
        height,
        borderRadius: radius.lg,
        overflow:     'hidden',
        borderWidth:  isActive ? 3 : 0,
        borderColor:  colors.primary,
      }}
    >
      <Image
        source={{ uri: video.thumbnail_url }}
        resizeMode="cover"
        style={{ width: '100%', height: '100%' }}
      />

      {showPlayer && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: playerOffsetX, width: playerWidth, height: playerHeight }}
        >
          <YoutubePlayer
            height={playerHeight}
            width={playerWidth}
            videoId={video.youtube_id}
            play={ready && playing}
            useLocalHTML
            // NUNCA usar um domínio youtube.com aqui — a própria biblioteca
            // intercepta qualquer navegação para "https://www.youtube.com/"
            // e abre-a no Safari/app do YouTube, tratando-a como se o
            // utilizador tivesse clicado num link (foi o que causou o
            // redirecionamento automático ao abrir a homepage). Usamos o
            // domínio oficial da própria biblioteca só para dar uma
            // origem https:// válida ao iframe, sem essa colisão.
            baseUrlOverride="https://lonelycpp.github.io"
            onReady={() => {
              console.log('[VideoCard] onReady, videoId:', video.youtube_id);
              setReady(true);
            }}
            onChangeState={(state: PLAYER_STATES) => {
              console.log('[VideoCard] onChangeState:', state);
              if (state === PLAYER_STATES.ENDED) onEnded?.();
            }}
            onError={(err: string) => {
              console.log('[VideoCard] onError:', err, 'videoId:', video.youtube_id);
              setPlayerFailed(true);
            }}
            mute
            forceAndroidAutoplay
            webViewProps={{
              allowsInlineMediaPlayback: true,
              mediaPlaybackRequiresUserAction: false,
            }}
            initialPlayerParams={{ controls: false, modestbranding: true, rel: false }}
          />
        </View>
      )}

      {showPlayer && !playing && (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            alignSelf: 'center',
            top: '42%',
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="play" size={26} color={colors.textInverted} style={{ marginLeft: 3 }} />
        </View>
      )}

      {!isActive && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
          }}
        />
      )}

      <View style={{ position: 'absolute', top: 12, left: 12 }}>
        {isYoutube ? (
          <Pressable onPress={handleOpenOnYoutube} hitSlop={6}>
            <SourceBadge fonte={video.fonte ?? 'youtube'} />
          </Pressable>
        ) : (
          <SourceBadge fonte={video.fonte ?? 'youtube'} />
        )}
      </View>

      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: 12,
        }}
      >
        <Text
          numberOfLines={2}
          style={{ fontFamily: fonts.semibold, color: colors.textInverted }}
        >
          {video.titulo}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted }}>
          {video.canal} · {video.duracao}
        </Text>
      </View>
    </Pressable>
  );
}
