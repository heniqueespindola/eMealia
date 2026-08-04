import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from '@/hooks/useTranslation';
import { LEGAL_CONTENT } from '@/constants/legal';
import { colors, fonts, spacing } from '@/constants/theme';

interface LegalDocumentScreenProps {
  documento: 'termos' | 'privacidade';
}

export function LegalDocumentScreen({ documento }: LegalDocumentScreenProps) {
  const { idioma } = useTranslation();
  const locale = idioma === 'es' || idioma === 'en' ? idioma : 'pt';
  const doc = LEGAL_CONTENT[locale][documento];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bgDark }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12} style={{ padding: spacing.xs }}>
          <Ionicons name="close" size={24} color={colors.textInverted} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 24, color: colors.primary, marginBottom: spacing.xs }}>
          {doc.titulo}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted, marginBottom: spacing.lg }}>
          {doc.atualizado}
        </Text>
        <Text style={{ fontFamily: fonts.regular, fontSize: 14, lineHeight: 22, color: colors.textInverted }}>
          {doc.corpo}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
