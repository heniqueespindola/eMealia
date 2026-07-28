import { View, Text } from 'react-native';
import { DIAS_SEMANA, MOMENTOS } from '@/constants/planner';
import { DayMacroBar } from './DayMacroBar';
import { PlannerSlotCard } from './PlannerSlotCard';
import { PlannerSlotEmpty } from './PlannerSlotEmpty';
import { colors, fonts, spacing } from '@/constants/theme';
import type { MealPlanItem, MacroNutrients, Momento } from '@emealia/types';

interface PlannerDayRowProps {
  diaSemana:       number;
  items:           MealPlanItem[];
  macros:          { totais: MacroNutrients; parcial: boolean } | undefined;
  itemEmMovimento: MealPlanItem | null;
  onSlotPress:     (momento: Momento, itemExistente: MealPlanItem | null) => void;
  onRemove:        (item: MealPlanItem) => void;
  onTrocar:        (item: MealPlanItem) => void;
}

export function PlannerDayRow({
  diaSemana,
  items,
  macros,
  itemEmMovimento,
  onSlotPress,
  onRemove,
  onTrocar,
}: PlannerDayRowProps) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs }}>
        <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.textInverted }}>
          {DIAS_SEMANA[diaSemana]}
        </Text>
        {macros && <DayMacroBar totais={macros.totais} parcial={macros.parcial} />}
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {MOMENTOS.map((m) => {
          const item = items.find((i) => i.momento === m.value) ?? null;
          return (
            <View key={m.value} style={{ flex: 1 }}>
              {item ? (
                <PlannerSlotCard
                  item={item}
                  selecionado={itemEmMovimento?.id === item.id}
                  onPress={() => onSlotPress(m.value, item)}
                  onRemove={() => onRemove(item)}
                  onTrocar={() => onTrocar(item)}
                />
              ) : (
                <PlannerSlotEmpty
                  destacado={itemEmMovimento !== null}
                  onPress={() => onSlotPress(m.value, null)}
                />
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
