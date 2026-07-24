import { View, Text, Pressable } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface IngredientAutocompleteListProps {
  suggestions: string[];
  onSelect:    (nome: string) => void;
}

export function IngredientAutocompleteList({ suggestions, onSelect }: IngredientAutocompleteListProps) {
  return (
    <View style={{ backgroundColor: colors.bgDarkAlt, borderRadius: radius.md, overflow: 'hidden' }}>
      {suggestions.map((s) => (
        <Pressable
          key={s}
          onPress={() => onSelect(s)}
          style={{
            paddingHorizontal: 14,
            paddingVertical:   10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
          }}
        >
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textInverted }}>{s}</Text>
        </Pressable>
      ))}
    </View>
  );
}
