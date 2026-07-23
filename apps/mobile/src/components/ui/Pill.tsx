import { Pressable, Text } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface PillProps {
  label:    string;
  selected: boolean;
  onPress:  () => void;
}

export function Pill({ label, selected, onPress }: PillProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingHorizontal: 16,
        paddingVertical:   10,
        borderRadius:       radius.full,
        borderWidth:        1,
        borderColor:        selected ? colors.primary : colors.border,
        backgroundColor:    selected ? colors.primary : 'transparent',
        marginRight:        8,
        marginBottom:       8,
      }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: selected ? colors.primaryDark : colors.textPrimary }}>
        {label}
      </Text>
    </Pressable>
  );
}
