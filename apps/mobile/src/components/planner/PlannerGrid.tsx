import { FlatList } from 'react-native';
import { PlannerDayRow } from './PlannerDayRow';
import { spacing } from '@/constants/theme';
import type { MealPlanItem, MacroNutrients, Momento } from '@emealia/types';

interface PlannerGridProps {
  items:           MealPlanItem[];
  macrosByDia:     Record<number, { totais: MacroNutrients; parcial: boolean }>;
  itemEmMovimento: MealPlanItem | null;
  onSlotPress:     (dia: number, momento: Momento, itemExistente: MealPlanItem | null) => void;
  onRemove:        (item: MealPlanItem) => void;
  onTrocar:        (item: MealPlanItem) => void;
}

export function PlannerGrid({ items, macrosByDia, itemEmMovimento, onSlotPress, onRemove, onTrocar }: PlannerGridProps) {
  return (
    <FlatList
      data={[0, 1, 2, 3, 4, 5, 6]}
      keyExtractor={(dia) => String(dia)}
      contentContainerStyle={{ paddingBottom: spacing.lg }}
      renderItem={({ item: dia }) => (
        <PlannerDayRow
          diaSemana={dia}
          items={items.filter((i) => i.dia_semana === dia)}
          macros={macrosByDia[dia]}
          itemEmMovimento={itemEmMovimento}
          onSlotPress={(momento, itemExistente) => onSlotPress(dia, momento, itemExistente)}
          onRemove={onRemove}
          onTrocar={onTrocar}
        />
      )}
    />
  );
}
