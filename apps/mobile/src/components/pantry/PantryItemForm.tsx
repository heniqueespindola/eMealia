import { useEffect, useState } from 'react';
import { Modal, View, Text, ScrollView, Pressable } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Pill';
import { IngredientAutocompleteList } from '@/components/pantry/IngredientAutocompleteList';
import { BarcodeScanner } from '@/components/pantry/BarcodeScanner';
import { useIngredientAutocomplete } from '@/hooks/useIngredientAutocomplete';
import { getProductByBarcode } from '@/lib/openFoodFacts';
import { CATEGORIAS_DESPENSA } from '@/constants/pantry';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';
import type { CategoriaDespensa, PantryItem } from '@emealia/types';

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

interface PantryItemFormValues {
  nome:       string;
  quantidade: string | null;
  expira_em:  string | null;
  categoria:  CategoriaDespensa;
  barcode:    string | null;
}

interface PantryItemFormProps {
  visible:       boolean;
  onClose:       () => void;
  onSubmit:      (values: PantryItemFormValues) => Promise<void>;
  initialValues?: Partial<PantryItem>;
  limitReached:  boolean;
  limite:        number;
}

export function PantryItemForm({ visible, onClose, onSubmit, initialValues, limitReached, limite }: PantryItemFormProps) {
  const { t } = useTranslation();
  const isEditing = !!initialValues;

  const [nome, setNome]           = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [expiraEm, setExpiraEm]   = useState('');
  const [categoria, setCategoria] = useState<CategoriaDespensa>('outros');
  const [barcode, setBarcode]     = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [naoEncontrado, setNaoEncontrado]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const suggestions = useIngredientAutocomplete(nome);

  useEffect(() => {
    setNome(initialValues?.nome ?? '');
    setQuantidade(initialValues?.quantidade ?? '');
    setExpiraEm(initialValues?.expira_em ?? '');
    setCategoria(initialValues?.categoria ?? 'outros');
    setBarcode(initialValues?.barcode ?? null);
    setDateError(null);
    setScannerVisible(false);
    setNaoEncontrado(false);
  }, [visible, initialValues]);

  async function handleScanned(scannedBarcode: string) {
    setScannerVisible(false);
    setBarcode(scannedBarcode);
    const product = await getProductByBarcode(scannedBarcode);
    if (product) {
      setNome(product.nome);
      setNaoEncontrado(false);
    } else {
      setNaoEncontrado(true);
    }
  }

  async function handleSubmit() {
    if (!nome.trim() || (limitReached && !isEditing)) return;

    const expiraEmTrimmed = expiraEm.trim();
    if (expiraEmTrimmed && !DATA_REGEX.test(expiraEmTrimmed)) {
      setDateError(t('pantryForm.erroFormatoData'));
      return;
    }
    setDateError(null);

    setSubmitting(true);
    await onSubmit({
      nome:       nome.trim(),
      quantidade: quantidade.trim() || null,
      expira_em:  expiraEmTrimmed || null,
      categoria,
      barcode,
    });
    setSubmitting(false);
  }

  const submitDisabled = !nome.trim() || (limitReached && !isEditing);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bgDark }} contentContainerStyle={{ padding: spacing.lg }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
          <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.primary }}>
            {isEditing ? t('pantryForm.editarItem') : t('pantryForm.adicionarItem')}
          </Text>
          <Pressable onPress={onClose} hitSlop={8}>
            <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted }}>{t('common.cancelar')}</Text>
          </Pressable>
        </View>

        <Input label={t('pantryForm.nome')} value={nome} onChangeText={setNome} placeholder="ex: tomate" />
        {suggestions.length > 0 && (
          <IngredientAutocompleteList suggestions={suggestions} onSelect={setNome} />
        )}

        <Input label={t('pantryForm.quantidade')} value={quantidade} onChangeText={setQuantidade} placeholder="ex: 500g" />

        <Input
          label={t('pantryForm.validade')}
          value={expiraEm}
          onChangeText={setExpiraEm}
          placeholder="ex: 2026-08-01"
          error={dateError ?? undefined}
        />

        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted, marginBottom: 6 }}>
          {t('pantryForm.categoria')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md }}>
          {CATEGORIAS_DESPENSA.map((cat) => (
            <Pill
              key={cat.value}
              label={t(cat.labelKey)}
              selected={categoria === cat.value}
              onPress={() => setCategoria(cat.value)}
            />
          ))}
        </View>

        {!isEditing && (
          <View style={{ marginBottom: spacing.md }}>
            <Button label={t('pantryForm.lerCodigoBarras')} variant="outline" onPress={() => setScannerVisible(true)} />
            {naoEncontrado && (
              <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginTop: spacing.sm }}>
                {t('pantryForm.produtoNaoEncontrado')}
              </Text>
            )}
          </View>
        )}

        {limitReached && !isEditing && (
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.primaryDark, marginBottom: spacing.md }}>
            {t('pantryForm.limiteAtingido', { limite })}
          </Text>
        )}

        <Button label={t('common.guardar')} onPress={handleSubmit} disabled={submitDisabled} loading={submitting} />
      </ScrollView>

      <Modal visible={scannerVisible} animationType="slide">
        <BarcodeScanner onScanned={handleScanned} onClose={() => setScannerVisible(false)} />
      </Modal>
    </Modal>
  );
}
