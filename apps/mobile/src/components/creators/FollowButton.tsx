import { Pressable, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface FollowButtonProps {
  following: boolean;
  onPress:   () => void;
}

export function FollowButton({ following, onPress }: FollowButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 14,
        paddingVertical:   8,
        borderRadius:      radius.full,
        borderWidth:       1,
        borderColor:       colors.primary,
        backgroundColor:   following ? 'transparent' : colors.primary,
      }}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 13, color: following ? colors.primary : colors.primaryDark }}>
        {following ? 'A seguir' : 'Seguir'}
      </Text>
    </Pressable>
  );
}
