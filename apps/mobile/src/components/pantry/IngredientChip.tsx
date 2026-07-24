import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, radius } from '@/constants/theme';

interface IngredientChipProps {
  nome:     string;
  onRemove: () => void;
}

export function IngredientChip({ nome, onRemove }: IngredientChipProps) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgDarkAlt,
      borderWidth: 1, borderColor: colors.primary, borderRadius: radius.full,
      paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, marginBottom: 8,
    }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted, marginRight: 6 }}>
        {nome}
      </Text>
      <Pressable onPress={onRemove} hitSlop={8}>
        <Ionicons name="close-circle" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}
