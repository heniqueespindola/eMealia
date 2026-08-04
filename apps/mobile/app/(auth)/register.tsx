import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable, Alert } from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { getSupabase } from '@/lib/supabase';
import { useTranslation } from '@/hooks/useTranslation';
import { colors, fonts, radius } from '@/constants/theme';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password || !confirmPassword) {
      setError(t('auth.register.erroCamposVazios'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.register.erroPasswordsDiferentes'));
      return;
    }
    if (!gdprAccepted) {
      setError(t('auth.register.erroTermos'));
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await signUp(email.trim(), password);
      if (data.user) {
        await getSupabase()
          .from('profiles')
          .update({ gdpr_consent: true, gdpr_consent_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }

      if (!data.session) {
        // Sem sessão = o projeto Supabase exige confirmação de email antes
        // de autenticar. O _layout.tsx raiz só navega quando `session`
        // aparece, o que nunca vai acontecer sozinho aqui — por isso
        // avisamos o utilizador e mandamo-lo explicitamente para o login.
        Alert.alert(
          t('auth.register.confirmarEmailTitulo'),
          t('auth.register.confirmarEmailMensagem'),
          [{ text: t('common.entendido'), onPress: () => router.replace('/(auth)/login') }]
        );
        return;
      }
      // Nota: se `data.session` existir (confirmação de email desativada
      // no projeto Supabase), não navegamos manualmente aqui — o
      // _layout.tsx raiz reage à mudança de `session`/`profile` e faz o
      // redirect para o onboarding automaticamente.
    } catch (err) {
      setError(t(getAuthErrorMessage(err)));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.bgDark }}
    >
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text style={{ fontFamily: fonts.display, fontSize: 32, color: colors.textInverted, textAlign: 'center', marginBottom: 32 }}>
          eMealia
        </Text>

        <Input
          label={t('auth.login.emailLabel')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('auth.login.emailPlaceholder')}
        />
        <Input
          label={t('auth.login.passwordLabel')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <Input
          label={t('auth.register.confirmarPassword')}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder="••••••••"
        />

        <Pressable
          onPress={() => setGdprAccepted((prev) => !prev)}
          style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}
        >
          <View
            style={{
              width: 20,
              height: 20,
              borderRadius: radius.sm,
              borderWidth: 1,
              borderColor: colors.primary,
              backgroundColor: gdprAccepted ? colors.primary : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 10,
            }}
          >
            {gdprAccepted && <Ionicons name="checkmark" size={14} color={colors.bgDark} />}
          </View>
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textInverted, flex: 1 }}>
            {t('auth.register.aceitoTermosPrefixo')}
            <Text
              onPress={() => router.push('/legal/terms')}
              style={{ textDecorationLine: 'underline', color: colors.primary }}
            >
              {t('auth.register.aceitoTermosTermos')}
            </Text>
            {t('auth.register.aceitoTermosMeio')}
            <Text
              onPress={() => router.push('/legal/privacy')}
              style={{ textDecorationLine: 'underline', color: colors.primary }}
            >
              {t('auth.register.aceitoTermosPrivacidade')}
            </Text>
            {t('auth.register.aceitoTermosSufixo')}
          </Text>
        </Pressable>

        {error ? (
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.primaryDark, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}

        <Button label={t('auth.register.criarConta')} onPress={handleSubmit} loading={loading} />

        <Link href="/(auth)/login" asChild>
          <Pressable style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
              {t('auth.register.jaTemConta')}
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
