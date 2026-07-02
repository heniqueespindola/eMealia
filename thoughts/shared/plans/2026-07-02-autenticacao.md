---
data: 2026-07-02
feature: "Autenticação (F01) — login, registo e protecção de rotas"
research: "thoughts/shared/research/2026-07-02-autenticacao.md"
status: aguarda_implementacao
---

# Spec: Autenticação (F01)

## Visão Geral
Implementar login e registo com Supabase Auth (email + password) na app mobile, com protecção de rotas do grupo `(tabs)`, consentimento GDPR no registo, e componentes de UI mínimos reutilizáveis (`Button`, `Input`) que servem de base ao resto da app.

## Decisões desta fase (confirmadas com o utilizador)
1. **Lógica de auth**: expandir `apps/mobile/src/hooks/useAuth.ts` localmente (não criar `packages/supabase/src/queries/auth.ts` nesta feature — a app web fica para depois).
2. **Redirect pós-registo**: `app/onboarding/step1.tsx` (não homepage directa).
3. **GDPR**: checkbox obrigatório no registo, popula `profiles.gdpr_consent` / `gdpr_consent_at`.
4. **UI**: criar `Button` e `Input` mínimos em `src/components/ui/`, é a primeira feature de UI do projecto.
5. **Protecção de rotas**: como `expo-router@4.0.22` não tem `<Stack.Protected>`, usar `useSegments()` + `useEffect` + `router.replace()` no root layout — **apenas para bloquear acesso sem sessão**, sem regra automática de "sessão activa → sair do grupo (auth)" (essa navegação é feita explicitamente por cada ecrã após sucesso, para evitar corrida entre o redirect global e o redirect específico de login/registo → onboarding).

---

## Ficheiros a Criar

### `apps/mobile/src/components/ui/Button.tsx`
**Propósito:** Botão reutilizável com variantes `primary`/`outline`, estado de loading.
**Conteúdo:**
```typescript
import { Pressable, Text, ActivityIndicator } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline';
}

export function Button({ label, onPress, loading, disabled, variant = 'primary' }: ButtonProps) {
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={{
        backgroundColor: isPrimary ? colors.primary : 'transparent',
        borderWidth: isPrimary ? 0 : 1,
        borderColor: colors.primary,
        borderRadius: radius.md,
        paddingVertical: 14,
        alignItems: 'center',
        opacity: disabled || loading ? 0.6 : 1,
      }}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.primaryDark : colors.primary} />
      ) : (
        <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: isPrimary ? colors.primaryDark : colors.primary }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
```
Nota: texto sobre fundo âmbar usa `colors.primaryDark` (#A35139), conforme regra da paleta no CLAUDE.md ("texto sobre âmbar claro").

### `apps/mobile/src/components/ui/Input.tsx`
**Propósito:** Campo de texto reutilizável com label e mensagem de erro opcional.
**Conteúdo:**
```typescript
import { View, Text, TextInput, TextInputProps } from 'react-native';
import { colors, fonts, radius } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, ...rest }: InputProps) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        {...rest}
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: colors.bgDarkAlt,
          borderWidth: 1,
          borderColor: error ? colors.primaryDark : colors.border,
          borderRadius: radius.md,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.textInverted,
          fontFamily: fonts.regular,
          fontSize: 15,
        }}
      />
      {error ? (
        <Text style={{ fontFamily: fonts.regular, fontSize: 13, color: colors.primaryDark, marginTop: 4 }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
```

### `apps/mobile/src/lib/authErrors.ts`
**Propósito:** Traduz mensagens de erro do Supabase Auth para pt-PT.
**Conteúdo:**
```typescript
export function getAuthErrorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : '';

  if (message.includes('Invalid login credentials')) return 'Email ou password incorretos.';
  if (message.includes('User already registered')) return 'Este email já está registado.';
  if (message.includes('Password should be at least')) return 'A password deve ter pelo menos 6 caracteres.';
  if (message.includes('Unable to validate email address')) return 'Introduz um email válido.';
  return message || 'Ocorreu um erro. Tenta novamente.';
}
```

---

## Ficheiros a Modificar

### `apps/mobile/src/hooks/useAuth.ts`
**Modificações:**
- [ ] Importar `useAuthStore` de `@/stores/authStore`
- [ ] Em ambos os pontos onde `session` é definido (`getSession().then(...)` e `onAuthStateChange`), chamar também `useAuthStore.getState().setUser(session?.user ?? null)` para manter o Zustand store sincronizado
- [ ] Adicionar `async function signIn(email: string, password: string)`:
  ```typescript
  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }
  ```
- [ ] Adicionar `async function signUp(email: string, password: string)`:
  ```typescript
  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data; // { user, session }
  }
  ```
- [ ] Adicionar `async function signOut()`:
  ```typescript
  async function signOut() {
    await supabase.auth.signOut();
  }
  ```
- [ ] Devolver `{ session, loading, user, signIn, signUp, signOut }` no `return` do hook

### `apps/mobile/app/(auth)/login.tsx`
**Reescrever por completo:**
- [ ] Form controlado com `useState` para `email`, `password`, `error`, `loading`
- [ ] Usa `Input` (email + password, `secureTextEntry` na password) e `Button` (label "Entrar", `loading` ligado ao estado)
- [ ] Validação básica antes de submeter: campos não vazios → senão `setError('Preenche o email e a password.')`
- [ ] `handleSubmit` chama `signIn(email.trim(), password)` de `useAuth()`; em sucesso faz `router.replace('/(tabs)')`; em erro faz `setError(getAuthErrorMessage(err))`
- [ ] Mensagem de erro (se existir) apresentada em `colors.primaryDark` acima do botão
- [ ] Link para registo: `<Link href="/(auth)/register" asChild>` envolvendo um `Pressable`/`Text` com "Não tens conta? Regista-te"
- [ ] Envolver em `KeyboardAvoidingView` (`behavior="padding"` no iOS) com `backgroundColor: colors.bgDark`
- [ ] Título "eMealia" com `style={{ fontFamily: fonts.display }}`, tamanho 32, centrado
- [ ] Cores/fontes sempre de `@/constants/theme`, nunca hardcoded

### `apps/mobile/app/(auth)/register.tsx`
**Reescrever por completo:**
- [ ] Form controlado com `useState` para `email`, `password`, `confirmPassword`, `gdprAccepted` (boolean), `error`, `loading`
- [ ] Usa `Input` (email, password, confirmar password) e `Button` (label "Criar conta")
- [ ] Checkbox custom (Pressable + `View` quadrado 20×20, `borderRadius: radius.sm`, preenchido com `colors.primary` quando `gdprAccepted`) com texto "Aceito os termos e a política de privacidade."
- [ ] Validações antes de submeter, por ordem:
  1. Campos vazios → `'Preenche todos os campos.'`
  2. `password !== confirmPassword` → `'As passwords não coincidem.'`
  3. `!gdprAccepted` → `'Tens de aceitar os termos para continuar.'`
- [ ] `handleSubmit`:
  ```typescript
  const data = await signUp(email.trim(), password);
  if (data.user) {
    await supabase
      .from('profiles')
      .update({ gdpr_consent: true, gdpr_consent_at: new Date().toISOString() })
      .eq('id', data.user.id);
  }
  router.replace('/onboarding/step1');
  ```
  (importar `supabase` de `@/lib/supabase` directamente neste ecrã, só para o update de `profiles`)
- [ ] Em erro: `setError(getAuthErrorMessage(err))`
- [ ] Link para login: `<Link href="/(auth)/login" asChild>` com "Já tens conta? Entra"
- [ ] Mesma base visual do login (`KeyboardAvoidingView`, `colors.bgDark`, título com `fonts.display`)

### `apps/mobile/app/_layout.tsx`
**Modificações:**
- [ ] Importar `useSegments`, `useRouter` de `expo-router` e `useAuth` de `@/hooks/useAuth`
- [ ] Chamar `const { session, loading: authLoading } = useAuth();` e `const segments = useSegments();` e `const router = useRouter();`
- [ ] Substituir a condição `if (!loaded) return null;` por `const appReady = loaded && !authLoading;` e usar `appReady` para controlar `SplashScreen.hideAsync()` (só esconder quando fontes **e** auth estiverem prontos) e o `return null` de guarda
- [ ] Adicionar `useEffect` de protecção de rotas:
  ```typescript
  useEffect(() => {
    if (!appReady) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    }
  }, [appReady, session, segments, router]);
  ```
- [ ] **Não** adicionar regra inversa "sessão activa + dentro de `(auth)` → redirect automático" — essa navegação já é feita explicitamente por `login.tsx` (`/(tabs)`) e `register.tsx` (`/onboarding/step1`) para evitar corrida entre os dois redirects
- [ ] Manter o `<Stack>` com os três `Stack.Screen` (`(auth)`, `(tabs)`, `onboarding`) inalterado

---

## Fases de Implementação

### Fase 1: Componentes UI base
**Ficheiros:**
- Criar `apps/mobile/src/components/ui/Button.tsx`
- Criar `apps/mobile/src/components/ui/Input.tsx`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck --workspace apps/mobile` (ou `cd apps/mobile && npx tsc --noEmit`) passa sem erros
- [ ] `cd apps/mobile && npm run lint` passa sem warnings nos dois ficheiros novos

**Critérios de sucesso (manuais):**
- [ ] N/A (sem consumidor ainda nesta fase)

### Fase 2: Hook de autenticação + utilitário de erros
**Ficheiros:**
- Modificar `apps/mobile/src/hooks/useAuth.ts`
- Criar `apps/mobile/src/lib/authErrors.ts`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa sem erros
- [ ] `signIn`/`signUp`/`signOut` tipam correctamente contra `@supabase/supabase-js` (sem `any`)

**Critérios de sucesso (manuais):**
- [ ] N/A (sem UI ainda nesta fase)

### Fase 3: Ecrãs de login e registo
**Ficheiros:**
- Modificar `apps/mobile/app/(auth)/login.tsx`
- Modificar `apps/mobile/app/(auth)/register.tsx`

**Depende de:** Fase 1 (Button, Input) e Fase 2 (useAuth, authErrors)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa sem erros
- [ ] `expo lint` sem warnings

**Critérios de sucesso (manuais):**
- [ ] No simulador, `app/(auth)/login.tsx`: submeter com campos vazios mostra erro sem chamar o Supabase
- [ ] Login com credenciais inválidas mostra "Email ou password incorretos."
- [ ] Login com credenciais válidas navega para `(tabs)` (feed)
- [ ] Registo com passwords diferentes mostra "As passwords não coincidem."
- [ ] Registo sem aceitar GDPR mostra "Tens de aceitar os termos para continuar."
- [ ] Registo válido cria utilizador no Supabase Auth, cria linha em `profiles` (via trigger) com `gdpr_consent=true`, e navega para `app/onboarding/step1.tsx`
- [ ] Registo com email já existente mostra "Este email já está registado."
- [ ] Navegação entre login ↔ registo via os links funciona

### Fase 4: Protecção de rotas
**Ficheiros:**
- Modificar `apps/mobile/app/_layout.tsx`

**Depende de:** Fase 2 (useAuth já expõe `session`/`loading`)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa sem erros

**Critérios de sucesso (manuais):**
- [ ] Sem sessão activa, abrir a app ou tentar navegar directamente para `(tabs)/index` redirecciona para `(auth)/login`
- [ ] Com sessão activa (após login), fechar e reabrir a app mantém a sessão (persistência via `expo-secure-store`) e não mostra o ecrã de login
- [ ] Sem sessão activa, tentar aceder a `onboarding/step1` também redirecciona para login (rota não protegida explicitamente mas fora do grupo `(auth)`)

---

## Estratégia de Testes
- **Unit:** não há framework de testes configurado no projecto ainda — validar manualmente conforme os critérios acima. Não introduzir Jest/RNTL nesta feature (fora do âmbito da spec).
- **Manual:** correr `cd apps/mobile && npx expo start`, testar os fluxos de login/registo/logout no simulador iOS ou Android, incluindo os casos de erro listados na Fase 3.

## Notas de Implementação
- **Confirmar antes de testar:** `supabase/schema.sql` tem de já ter sido corrido no projecto Supabase real (`nbohketkwzgicvyjfroc.supabase.co`) para o trigger `handle_new_user` existir — sem ele, o registo cria o utilizador em `auth.users` mas não cria a linha em `profiles`, e o `update` de `gdpr_consent` em `register.tsx` falha silenciosamente (0 linhas afectadas).
- **Confirmar nas definições do Supabase Auth:** assume-se que "Confirm email" está desactivado no dashboard, para que `supabase.auth.signUp` devolva uma sessão activa imediatamente. Se estiver activado, `data.session` vem `null` e o `router.replace('/onboarding/step1')` falha silenciosamente (o guard de `_layout.tsx` vai mandar o utilizador de volta para login). Isto está fora do âmbito desta spec — confirmar a definição antes de testar a Fase 3.
- `useAuthStore` (Zustand) fica sincronizado com `session.user` via `useAuth`, mas o campo `plan` mantém-se sempre `'free'` por omissão — sincronizar com `profiles.plano` (via query após login) fica fora do âmbito desta feature.
- `signOut()` fica exposto no hook mas sem consumidor nesta feature (o ecrã de perfil ainda não está implementado) — não criar UI para logout aqui.
- Decisão explícita de não usar `packages/supabase/src/queries/auth.ts`: mantém-se inconsistente com a regra geral do CLAUDE.md ("lógica de negócio e queries → packages/"), mas consistente com o padrão já existente em `useAuth.ts`. Se a autenticação web for implementada no futuro, considerar extrair nessa altura.
- `expo-router@4.0.22` não suporta `<Stack.Protected>` — não usar essa API mesmo que apareça em exemplos online de versões mais recentes.
- Login/registo não têm recuperação de password nem verificação de email obrigatória — confirmado como fora do âmbito no ticket original.

## Referências
- Research: `thoughts/shared/research/2026-07-02-autenticacao.md`
- Ticket: `thoughts/shared/tickets/2026-07-02-autenticacao.md`
- Cliente Supabase: `apps/mobile/src/lib/supabase.ts`
- Schema `profiles`: `supabase/schema.sql`
- Padrão de hook existente: `apps/mobile/src/hooks/usePantry.ts`
