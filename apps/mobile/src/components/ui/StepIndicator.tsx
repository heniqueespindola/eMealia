import { View, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface StepIndicatorProps {
  current: number;
  total:   number;
}

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <View style={{ alignItems: 'center', marginBottom: 24 }}>
      <View style={{ flexDirection: 'row', marginBottom: 8 }}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={{
              width:  i + 1 === current ? 24 : 8,
              height: 8,
              borderRadius:    radius.full,
              backgroundColor: i + 1 <= current ? colors.primary : colors.border,
              marginHorizontal: 4,
            }}
          />
        ))}
      </View>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.primaryDark }}>
        {current}/{total}
      </Text>
    </View>
  );
}
