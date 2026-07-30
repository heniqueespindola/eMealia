import { useState } from 'react';
import { View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IngredientAutocompleteList } from '@/components/pantry/IngredientAutocompleteList';
import { useIngredientAutocomplete } from '@/hooks/useIngredientAutocomplete';
import { useTranslation } from '@/hooks/useTranslation';
import { spacing } from '@/constants/theme';

interface ShoppingListAddFormProps {
  onAdd: (nome: string) => void;
}

export function ShoppingListAddForm({ onAdd }: ShoppingListAddFormProps) {
  const { t } = useTranslation();
  const [texto, setTexto] = useState('');
  const suggestions = useIngredientAutocomplete(texto);

  function submit(nome: string) {
    if (!nome.trim()) return;
    onAdd(nome.trim());
    setTexto('');
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Input placeholder={t('shopping.adicionarItemPlaceholder')} value={texto} onChangeText={setTexto} onSubmitEditing={() => submit(texto)} label={t('shopping.adicionarItem')} />
      {suggestions.length > 0 && <IngredientAutocompleteList suggestions={suggestions} onSelect={submit} />}
      <Button label={t('common.adicionar')} onPress={() => submit(texto)} disabled={!texto.trim()} />
    </View>
  );
}
