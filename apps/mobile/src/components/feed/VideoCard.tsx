import { Pressable, Image, View, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';
import { SourceBadge } from '@/components/feed/SourceBadge';
import { ProgressRing } from '@/components/feed/ProgressRing';
import type { VideoItem } from '@emealia/types';

interface VideoCardProps {
  video: VideoItem;
  width: number;
  height: number;
  isActive: boolean;
  isAutoplaying: boolean;
  onPress: () => void;
}

export function VideoCard({ video, width, height, isActive, isAutoplaying, onPress }: VideoCardProps) {
  return (
    <Pressable
      onPress={onPress}
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
        <SourceBadge fonte={video.fonte ?? 'youtube'} />
      </View>

      <View
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

      <View style={{ position: 'absolute', alignSelf: 'center', top: '42%' }}>
        <ProgressRing size={56} active={isAutoplaying} />
      </View>
    </Pressable>
  );
}
