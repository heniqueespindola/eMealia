import { Modal, View, Text, ScrollView, Pressable } from 'react-native';
import { Pill } from '@/components/ui/Pill';
import { colors, fonts, spacing } from '@/constants/theme';
import type { ColecaoOption } from '@/constants/favoritos';

interface ColecaoPickerModalProps {
  visible:  boolean;
  colecoes: ColecaoOption[];
  onSelect: (colecao: string) => void;
  onClose:  () => void;
}

export function ColecaoPickerModal({ visible, colecoes, onSelect, onClose }: ColecaoPickerModalProps) {
  function handleSelect(value: string) {
    onSelect(value);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <View style={{ backgroundColor: colors.bgDark, padding: spacing.lg, borderTopLeftRadius: 20, borderTopRightRadius: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
            <Text style={{ fontFamily: fonts.display, fontSize: 20, color: colors.primary }}>
              Mover para coleção
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Text style={{ fontFamily: fonts.medium, fontSize: 15, color: colors.textMuted }}>Cancelar</Text>
            </Pressable>
          </View>

          <ScrollView>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {colecoes.map((c) => (
                <Pill
                  key={c.value}
                  label={c.label}
                  selected={false}
                  onPress={() => handleSelect(c.value)}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
