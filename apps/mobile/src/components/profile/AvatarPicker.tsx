import { useState } from 'react';
import { View, Text, Image, Pressable, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { uploadAvatar, updateProfile } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, spacing } from '@/constants/theme';

interface AvatarPickerProps {
  userId:    string;
  avatarUrl: string | null;
}

export function AvatarPicker({ userId, avatarUrl }: AvatarPickerProps) {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) return;

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (resultado.canceled) return;

    setUploading(true);
    try {
      const base64 = await FileSystem.readAsStringAsync(resultado.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 });
      const { data, error } = await uploadAvatar(supabase!, userId, decode(base64));
      if (data) {
        const { data: p } = await updateProfile(supabase!, userId, { avatar_url: data.publicUrl });
        if (p) useProfileStore.getState().setProfile(p);
      } else {
        console.error('[AvatarPicker] uploadAvatar falhou:', error);
        Alert.alert(t('common.erro'), t('profile.erroUpload'));
      }
    } catch (err) {
      console.error('[AvatarPicker] escolherFoto exceção:', err);
      Alert.alert(t('common.erro'), t('profile.erroUpload'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
      <View style={{ width: 88, height: 88, borderRadius: 44, backgroundColor: colors.border, overflow: 'hidden' }}>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={{ width: 88, height: 88 }} /> : null}
        {uploading && (
          <View
            style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)',
            }}
          >
            <ActivityIndicator color={colors.white} />
          </View>
        )}
      </View>
      <Pressable onPress={escolherFoto} disabled={uploading} style={{ marginTop: spacing.sm }} hitSlop={8}>
        <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.primary }}>
          {t('profile.editarFoto')}
        </Text>
      </Pressable>
    </View>
  );
}
