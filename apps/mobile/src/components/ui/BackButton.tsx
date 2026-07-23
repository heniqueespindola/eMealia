import { Pressable, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, fonts } from '@/constants/theme';

export function BackButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.back()}
      hitSlop={12}
      style={{
        width:  36,
        height: 36,
        borderRadius:    18,
        borderWidth:     1,
        borderColor:     colors.border,
        alignItems:      'center',
        justifyContent:  'center',
        marginBottom:    16,
      }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: 18, color: colors.textPrimary }}>
        ←
      </Text>
    </Pressable>
  );
}
