# F01 — Autenticação

Fonte: `thoughts/shared/plans/2026-07-02-autenticacao.md`

## Pré-requisitos
- [ ] `supabase/schema.sql` corrido no projecto real, incluindo o trigger `handle_new_user` (sem ele, o registo cria o utilizador em `auth.users` mas **não** cria a linha em `profiles`)
- [ ] Confirmar no Supabase Dashboard → Auth → Settings se "Confirm email" está **desactivado** (se estiver activo, `signUp` não devolve sessão imediata e o teste de registo falha de forma diferente do esperado — documentar qual o comportamento real antes de testar)
- [ ] App aberta de raiz (sem sessão activa) — usar `expo start -c` ou desinstalar/reinstalar se necessário para garantir que não há sessão persistida

## Testes automáticos / de código
- [ ] `cd apps/mobile && npx tsc --noEmit` sem erros
- [ ] `cd apps/mobile && npm run lint` sem warnings em `Button.tsx`, `Input.tsx`, `useAuth.ts`, `authErrors.ts`, `login.tsx`, `register.tsx`
- [ ] Inspeccionar `authErrors.ts` manualmente contra os 4 casos mapeados (`Invalid login credentials`, `User already registered`, `Password should be at least`, `Unable to validate email address`) — **candidato a teste unitário** puro, sem I/O

## Testes manuais — fluxo feliz
1. [ ] Abrir a app sem sessão → é redireccionado automaticamente para `/(auth)/login`
2. [ ] No ecrã de login, tocar em "Não tens conta? Regista-te" → navega para `/(auth)/register`
3. [ ] Preencher email válido novo + password (≥6 caracteres) + password de confirmação igual + aceitar checkbox GDPR → tocar "Criar conta"
4. [ ] Confirma que a app navega para `/onboarding/step1` (não para a homepage)
5. [ ] Voltar ao login com outra conta ou a mesma (se "Confirm email" desactivado) e testar login: preencher email + password correctos → tocar "Entrar" → navega para `/(tabs)` (homepage)
6. [ ] Fechar completamente a app e reabrir → sessão mantém-se, não volta a mostrar o login (persistência via `expo-secure-store`)

## Testes manuais — casos de erro e limites
- [ ] Login com campos vazios → mensagem "Preenche o email e a password." sem chamar o Supabase (testar em modo avião para confirmar que não há tentativa de rede)
- [ ] Login com credenciais inválidas (email existente, password errada) → "Email ou password incorretos."
- [ ] Registo com campos vazios → "Preenche todos os campos."
- [ ] Registo com passwords diferentes → "As passwords não coincidem."
- [ ] Registo sem aceitar o checkbox GDPR → "Tens de aceitar os termos para continuar."
- [ ] Registo com email já registado → "Este email já está registado."
- [ ] Registo com password curta (<6 caracteres) → "A password deve ter pelo menos 6 caracteres."
- [ ] Registo com email em formato inválido (ex: "abc") → "Introduz um email válido."
- [ ] Link "Já tens conta? Entra" em `register.tsx` navega correctamente para `/(auth)/login`

## Testes manuais — protecção de rotas
- [ ] Sem sessão activa, tentar navegar directamente (deep link ou manipulação manual) para `/(tabs)` → redireccionado para `/(auth)/login`
- [ ] Sem sessão activa, tentar aceder a `/onboarding/step1` → também redireccionado para login (rota fora do grupo `(auth)`, sem protecção explícita própria)
- [ ] Com sessão activa mas dentro de `(auth)` por navegação manual (ex: back button) → não deve haver loop de redirect nem crash (o guard global não força saída automática do grupo `(auth)`, é o próprio ecrã que decide navegar após sucesso)

## Verificação de dados (Supabase)
```sql
-- Depois de um registo bem-sucedido
select id, email, gdpr_consent, gdpr_consent_at, plano
from profiles
where email = '<email de teste>';
-- Esperado: gdpr_consent = true, gdpr_consent_at preenchido, plano = 'free'

-- Confirmar que o utilizador existe em auth.users
select id, email, created_at from auth.users where email = '<email de teste>';
```

## Regressão a vigiar
- Alterações a `_layout.tsx` (guard de rotas) são reaproveitadas por quase todas as features seguintes (onboarding, planos, etc.) — qualquer falha aqui bloqueia toda a app. Repetir este teste sempre que `_layout.tsx` for alterado por outra feature.
