import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';
import { colors, fonts, radius } from '@/constants/theme';

export default function RegisterScreen() {
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password || !confirmPassword) {
      setError('Preenche todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      setError('As passwords não coincidem.');
      return;
    }
    if (!gdprAccepted) {
      setError('Tens de aceitar os termos para continuar.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const data = await signUp(email.trim(), password);
      if (data.user) {
        await supabase
          .from('profiles')
          .update({ gdpr_consent: true, gdpr_consent_at: new Date().toISOString() })
          .eq('id', data.user.id);
      }
      // Nota: não navegamos manualmente aqui. O _layout.tsx raiz reage à
      // mudança de `session`/`profile` e faz o redirect para o onboarding
      // assim que a sessão fica disponível (ou para o login, se o Supabase
      // exigir confirmação de email antes de criar sessão).
    } catch (err) {
      setError(getAuthErrorMessage(err));
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
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="teu@email.com"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
        />
        <Input
          label="Confirmar password"
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
              marginRight: 10,
            }}
          />
          <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.textInverted, flex: 1 }}>
            Aceito os termos e a política de privacidade.
          </Text>
        </Pressable>

        {error ? (
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.primaryDark, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}

        <Button label="Criar conta" onPress={handleSubmit} loading={loading} />

        <Link href="/(auth)/login" asChild>
          <Pressable style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
              Já tens conta? Entra
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
