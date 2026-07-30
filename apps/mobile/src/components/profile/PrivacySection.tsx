import { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { exportUserData } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';

interface PrivacySectionProps {
  userId: string;
}

export function PrivacySection({ userId }: PrivacySectionProps) {
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);

  async function handleExportar() {
    setExporting(true);
    try {
      const dados = await exportUserData(supabase!, userId);
      const uri = FileSystem.documentDirectory + `emealia-dados-${Date.now()}.json`;
      await FileSystem.writeAsStringAsync(uri, JSON.stringify(dados, null, 2));
      await Sharing.shareAsync(uri, { mimeType: 'application/json' });
    } catch (err) {
      console.error('[PrivacySection] handleExportar exceção:', err);
      Alert.alert(t('common.erro'), t('profile.erroExportar'));
    } finally {
      setExporting(false);
    }
  }

  async function eliminarConta() {
    const { error } = await supabase!.functions.invoke('delete-account');
    if (error) {
      console.error('[PrivacySection] delete-account falhou:', error);
      Alert.alert(t('common.erro'), t('profile.erroEliminarConta'));
      return;
    }
    await signOut();
    router.replace('/(auth)/login');
  }

  function confirmarEliminarConta() {
    Alert.alert(t('profile.eliminarContaTitulo'), t('profile.eliminarContaMensagem'), [
      { text: t('common.cancelar'), style: 'cancel' },
      { text: t('profile.eliminarConta'), style: 'destructive', onPress: eliminarConta },
    ]);
  }

  return (
    <Card style={{ marginBottom: spacing.md }}>
      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: colors.primary, marginBottom: spacing.md }}>
        {t('profile.seccaoPrivacidade')}
      </Text>

      <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm }}>
        {t('profile.exportarDadosDescricao')}
      </Text>
      <View style={{ marginBottom: spacing.md }}>
        <Button label={t('profile.exportarDados')} variant="outline" onPress={handleExportar} loading={exporting} />
      </View>

      <Button label={t('profile.eliminarConta')} variant="outline" onPress={confirmarEliminarConta} />
    </Card>
  );
}
