import { useEffect, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { VideoCard } from '@/components/feed/VideoCard';
import { colors } from '@/constants/theme';
import type { VideoItem } from '@emealia/types';

interface CarouselStripProps {
  videos: VideoItem[];
  onIndexChange: (index: number) => void;
}

interface CarouselItemProps {
  item: VideoItem;
  index: number;
  scrollX: Animated.SharedValue<number>;
  cardWidth: number;
  cardHeight: number;
  itemSpacing: number;
  snapInterval: number;
  isActive: boolean;
  isAutoplaying: boolean;
  onPress: () => void;
}

function CarouselItem({ item, index, scrollX, cardWidth, cardHeight, itemSpacing, snapInterval, isActive, isAutoplaying, onPress }: CarouselItemProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * snapInterval, index * snapInterval, (index + 1) * snapInterval];
    const scale = interpolate(scrollX.value, inputRange, [0.82, 1, 0.82], Extrapolation.CLAMP);
    const opacity = interpolate(scrollX.value, inputRange, [0.7, 1, 0.7], Extrapolation.CLAMP);
    return { transform: [{ scale }], opacity };
  });

  return (
    <Animated.View style={[{ marginHorizontal: itemSpacing / 2 }, animatedStyle]}>
      <VideoCard video={item} width={cardWidth} height={cardHeight} isActive={isActive} isAutoplaying={isAutoplaying} onPress={onPress} />
    </Animated.View>
  );
}

export function CarouselStrip({ videos, onIndexChange }: CarouselStripProps) {
  const { width } = useWindowDimensions();
  const CARD_WIDTH = Math.round(width * 0.6);
  const CARD_HEIGHT = Math.round(CARD_WIDTH * (16 / 9));
  const ITEM_SPACING = 16;
  const SNAP_INTERVAL = CARD_WIDTH + ITEM_SPACING;
  const SIDE_INSET = (width - CARD_WIDTH) / 2;

  const scrollX = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoplayIndex, setAutoplayIndex] = useState<number | null>(null);
  const listRef = useAnimatedRef<Animated.FlatList<VideoItem>>();

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  useEffect(() => {
    setAutoplayIndex(null);
    const timer = setTimeout(() => setAutoplayIndex(activeIndex), 4000);
    return () => clearTimeout(timer);
  }, [activeIndex, videos.length]);

  function scrollToIndex(index: number) {
    const offset = index * SNAP_INTERVAL;
    listRef.current?.scrollToOffset({ offset, animated: true });
    setActiveIndex(index);
  }

  function onMomentumScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const raw = Math.round(e.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    const index = Math.min(Math.max(raw, 0), videos.length - 1);
    setActiveIndex(index);
    onIndexChange(index);
  }

  return (
    <View>
      <Animated.FlatList
        ref={listRef}
        horizontal
        data={videos}
        keyExtractor={(v) => v.id}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SIDE_INSET }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onMomentumScrollEnd}
        renderItem={({ item, index }) => (
          <CarouselItem
            item={item}
            index={index}
            scrollX={scrollX}
            cardWidth={CARD_WIDTH}
            cardHeight={CARD_HEIGHT}
            itemSpacing={ITEM_SPACING}
            snapInterval={SNAP_INTERVAL}
            isActive={index === activeIndex}
            isAutoplaying={index === autoplayIndex}
            onPress={() => scrollToIndex(index)}
          />
        )}
      />

      <Pressable
        onPress={() => activeIndex > 0 && scrollToIndex(activeIndex - 1)}
        disabled={activeIndex === 0}
        style={{
          position: 'absolute', top: '50%', left: 8,
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: 'rgba(27,38,50,0.6)',
          alignItems: 'center', justifyContent: 'center',
          opacity: activeIndex === 0 ? 0.3 : 1,
        }}
      >
        <Ionicons name="chevron-back" size={28} color={colors.textInverted} />
      </Pressable>

      <Pressable
        onPress={() => activeIndex < videos.length - 1 && scrollToIndex(activeIndex + 1)}
        disabled={activeIndex === videos.length - 1}
        style={{
          position: 'absolute', top: '50%', right: 8,
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: 'rgba(27,38,50,0.6)',
          alignItems: 'center', justifyContent: 'center',
          opacity: activeIndex === videos.length - 1 ? 0.3 : 1,
        }}
      >
        <Ionicons name="chevron-forward" size={28} color={colors.textInverted} />
      </Pressable>
    </View>
  );
}
