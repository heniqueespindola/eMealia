import { View, Text, Pressable, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { isExpiringSoon } from '@/constants/pantry';
import { colors, fonts, spacing } from '@/constants/theme';
import type { PantryItem } from '@emealia/types';

interface PantryItemCardProps {
  item:     PantryItem;
  onEdit:   () => void;
  onDelete: () => void;
}

export function PantryItemCard({ item, onEdit, onDelete }: PantryItemCardProps) {
  function confirmDelete() {
    Alert.alert('Eliminar item', `Eliminar "${item.nome}" da despensa?`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: onDelete },
    ]);
  }

  return (
    <Swipeable
      renderRightActions={() => (
        <Pressable
          onPress={confirmDelete}
          style={{
            backgroundColor: colors.primaryDark,
            justifyContent: 'center',
            alignItems: 'center',
            width: 72,
            borderRadius: 20,
            marginBottom: spacing.sm,
          }}
        >
          <Ionicons name="trash-outline" size={22} color={colors.textInverted} />
        </Pressable>
      )}
    >
      <Pressable onPress={onEdit} onLongPress={confirmDelete}>
        <Card style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.textInverted }}>
                {item.nome}
              </Text>
              {item.quantidade ? (
                <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: 2 }}>
                  {item.quantidade}
                </Text>
              ) : null}
            </View>
            {isExpiringSoon(item.expira_em) && <Badge label="Expira em breve" variant="alerta" />}
          </View>
        </Card>
      </Pressable>
    </Swipeable>
  );
}
