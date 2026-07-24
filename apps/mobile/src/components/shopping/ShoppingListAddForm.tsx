import { useState } from 'react';
import { View } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { IngredientAutocompleteList } from '@/components/pantry/IngredientAutocompleteList';
import { useIngredientAutocomplete } from '@/hooks/useIngredientAutocomplete';
import { spacing } from '@/constants/theme';

interface ShoppingListAddFormProps {
  onAdd: (nome: string) => void;
}

export function ShoppingListAddForm({ onAdd }: ShoppingListAddFormProps) {
  const [texto, setTexto] = useState('');
  const suggestions = useIngredientAutocomplete(texto);

  function submit(nome: string) {
    if (!nome.trim()) return;
    onAdd(nome.trim());
    setTexto('');
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <Input placeholder="Adicionar item…" value={texto} onChangeText={setTexto} onSubmitEditing={() => submit(texto)} label="Adicionar item" />
      {suggestions.length > 0 && <IngredientAutocompleteList suggestions={suggestions} onSelect={submit} />}
      <Button label="+ Adicionar" onPress={() => submit(texto)} disabled={!texto.trim()} />
    </View>
  );
}
