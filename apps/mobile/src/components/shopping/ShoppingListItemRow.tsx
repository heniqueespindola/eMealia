import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { colors, fonts, spacing } from '@/constants/theme';
import type { ShoppingListItem } from '@emealia/types';

interface ShoppingListItemRowProps {
  item:     ShoppingListItem;
  onToggle: () => void;
  onDelete: () => void;
}

export function ShoppingListItemRow({ item, onToggle, onDelete }: ShoppingListItemRowProps) {
  return (
    <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
      <Pressable onPress={onToggle} hitSlop={8} style={{ marginRight: spacing.sm }}>
        <Ionicons
          name={item.comprado ? 'checkbox' : 'square-outline'}
          size={22}
          color={colors.primary}
        />
      </Pressable>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: fonts.semibold,
            fontSize: 15,
            color: colors.textInverted,
            textDecorationLine: item.comprado ? 'line-through' : 'none',
          }}
        >
          {item.nome}
        </Text>
        {item.quantidade ? (
          <Text
            style={{
              fontFamily: fonts.regular,
              fontSize: 13,
              color: colors.textMuted,
              marginTop: 2,
              textDecorationLine: item.comprado ? 'line-through' : 'none',
            }}
          >
            {item.quantidade}
          </Text>
        ) : null}
      </View>

      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash-outline" size={20} color={colors.primaryDark} />
      </Pressable>
    </Card>
  );
}
