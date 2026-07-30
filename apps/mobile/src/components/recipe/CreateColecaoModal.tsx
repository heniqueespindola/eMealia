import { useEffect, useState } from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';

interface CreateColecaoModalProps {
  visible:             boolean;
  coleccoesExistentes: string[];
  onCreate:            (nome: string) => void;
  onClose:             () => void;
}

export function CreateColecaoModal({ visible, coleccoesExistentes, onCreate, onClose }: CreateColecaoModalProps) {
  const { t } = useTranslation();
  const [nome, setNome] = useState('');

  useEffect(() => {
    setNome('');
  }, [visible]);

  const nomeTrimmed = nome.trim();
  const jaExiste = coleccoesExistentes.some((c) => c.toLowerCase() === nomeTrimmed.toLowerCase());
  const submitDisabled = !nomeTrimmed || jaExiste;

  function handleSubmit() {
    if (submitDisabled) return;
    onCreate(nomeTrimmed);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: colors.bgDark, padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.primary }}>
              {t('recipe.novaColecaoTitulo')}
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted }}>{t('common.cancelar')}</Text>
            </Pressable>
          </View>

          <Input label={t('recipe.novaColecaoNomeLabel')} value={nome} onChangeText={setNome} placeholder={t('recipe.novaColecaoPlaceholder')} />
          {jaExiste && (
            <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.primaryDark, marginBottom: spacing.sm }}>
              {t('recipe.colecaoDuplicada')}
            </Text>
          )}

          <Button label={t('common.criar')} onPress={handleSubmit} disabled={submitDisabled} />
        </View>
      </View>
    </Modal>
  );
}
