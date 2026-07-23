import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/hooks/useAuth';
import { getAuthErrorMessage } from '@/lib/authErrors';
import { colors, fonts } from '@/constants/theme';

export default function LoginScreen() {
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError('Preenche o email e a password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Nota: não navegamos manualmente aqui. O _layout.tsx raiz reage à
      // mudança de `session` e faz o redirect (para onboarding ou tabs,
      // consoante o perfil) assim que a sessão fica disponível.
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

        {error ? (
          <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.primaryDark, marginBottom: 16, textAlign: 'center' }}>
            {error}
          </Text>
        ) : null}

        <Button label="Entrar" onPress={handleSubmit} loading={loading} />

        <Link href="/(auth)/register" asChild>
          <Pressable style={{ marginTop: 20 }}>
            <Text style={{ fontFamily: fonts.regular, fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
              Não tens conta? Regista-te
            </Text>
          </Pressable>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
