import { View, Text, Pressable, Alert } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { MealPlanItem } from '@emealia/types';

interface PlannerSlotCardProps {
  item:        MealPlanItem;
  selecionado: boolean;
  onPress:     () => void;
  onRemove:    () => void;
  onTrocar:    () => void;
}

export function PlannerSlotCard({ item, selecionado, onPress, onRemove, onTrocar }: PlannerSlotCardProps) {
  const { t } = useTranslation();
  function confirmRemove() {
    Alert.alert(t('planner.removerTitulo'), t('planner.removerMensagem', { titulo: item.titulo }), [
      { text: t('common.cancelar'), style: 'cancel' },
      { text: t('planner.remover'), style: 'destructive', onPress: onRemove },
    ]);
  }

  return (
    <Swipeable
      renderRightActions={() => (
        <View style={{ flexDirection: 'row' }}>
          <Pressable
            onPress={onTrocar}
            style={{
              backgroundColor: colors.bgDarkAlt,
              justifyContent: 'center',
              alignItems: 'center',
              width: 36,
              borderRadius: radius.md,
              marginRight: spacing.xs,
            }}
          >
            <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
          </Pressable>
          <Pressable
            onPress={confirmRemove}
            style={{
              backgroundColor: colors.primaryDark,
              justifyContent: 'center',
              alignItems: 'center',
              width: 36,
              borderRadius: radius.md,
            }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.textInverted} />
          </Pressable>
        </View>
      )}
    >
      <Pressable onPress={onPress}>
        <Card
          style={{
            padding: spacing.xs,
            minHeight: 64,
            borderWidth: selecionado ? 2 : 0,
            borderColor: colors.primary,
          }}
        >
          <Text numberOfLines={2} style={{ fontFamily: fonts.medium, fontSize: 12, color: colors.textInverted }}>
            {item.titulo}
          </Text>
        </Card>
      </Pressable>
    </Swipeable>
  );
}
