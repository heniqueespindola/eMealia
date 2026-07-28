import { useState } from 'react';
import { Alert } from 'react-native';
import type { MealPlanItem, Momento, RecipeSource } from '@emealia/types';

interface Receita {
  recipe_id: string;
  titulo:    string;
  fonte:     RecipeSource;
}

interface UsePlannerScreenStateArgs {
  assignSlot: (dia: number, momento: Momento, receita: Receita) => Promise<void>;
  moveSlot:   (item: MealPlanItem, novoDia: number, novoMomento: Momento) => Promise<void>;
}

export function usePlannerScreenState({ assignSlot, moveSlot }: UsePlannerScreenStateArgs) {
  const [itemEmMovimento, setItemEmMovimento] = useState<MealPlanItem | null>(null);
  const [slotAlvo, setSlotAlvo] = useState<{ dia: number; momento: Momento } | null>(null);

  function handleSlotPress(dia: number, momento: Momento, itemExistente: MealPlanItem | null) {
    if (itemEmMovimento) {
      if (itemExistente) {
        Alert.alert(
          'Substituir receita',
          `Substituir "${itemExistente.titulo}" por "${itemEmMovimento.titulo}"?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Substituir',
              onPress: () => {
                moveSlot(itemEmMovimento, dia, momento);
                setItemEmMovimento(null);
              },
            },
          ]
        );
        return;
      }
      moveSlot(itemEmMovimento, dia, momento);
      setItemEmMovimento(null);
      return;
    }

    if (itemExistente) {
      setItemEmMovimento(itemExistente);
      return;
    }

    setSlotAlvo({ dia, momento });
  }

  function handleTrocar(item: MealPlanItem) {
    setSlotAlvo({ dia: item.dia_semana, momento: item.momento });
  }

  function handleSelecionarReceita(receita: Receita) {
    if (!slotAlvo) return;
    assignSlot(slotAlvo.dia, slotAlvo.momento, receita);
    setSlotAlvo(null);
  }

  function fecharModal() {
    setSlotAlvo(null);
  }

  return {
    itemEmMovimento,
    slotAlvo,
    handleSlotPress,
    handleTrocar,
    handleSelecionarReceita,
    fecharModal,
  };
}
