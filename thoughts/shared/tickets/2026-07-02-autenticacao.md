---
data: 2026-07-02
status: backlog
prioridade: alta
fase_mvp: sim
---

# Feature: Autenticação (Login e Registo)

## Contexto
O eMealia precisa de identificar utilizadores para associar despensa, favoritos, planeamento semanal e preferências dietéticas a uma conta. Sem autenticação não é possível persistir dados por utilizador nem aplicar os limites do plano Grátis vs Premium. Esta é a feature F01 do MVP e é pré-requisito para todas as restantes (onboarding, despensa, planeamento, pagamentos).

## Comportamento esperado
Ecrãs de login e registo com email + password via Supabase Auth. Após autenticação bem-sucedida, o utilizador é redireccionado automaticamente para a homepage (feed de vídeos). Rotas protegidas (tudo dentro de `(tabs)`) não podem ser acedidas sem sessão activa — o utilizador não autenticado é redireccionado para o login.

**Dado que** um utilizador não tem conta
**Quando** preenche email + password no ecrã de registo e submete
**Então** a conta é criada no Supabase Auth, o perfil é criado em `profiles`, e o utilizador é redireccionado para o onboarding (ou homepage, a confirmar)

**Dado que** um utilizador já tem conta
**Quando** faz login com email + password correctos
**Então** é autenticado e redireccionado automaticamente para a homepage

**Dado que** um utilizador não está autenticado
**Quando** tenta aceder a uma rota protegida (ex: `(tabs)/index`)
**Então** é redireccionado para o ecrã de login

## Critérios de aceitação
- [ ] Ecrã de login (`app/(auth)/login.tsx`) com campos email + password, validação básica, e link para registo
- [ ] Ecrã de registo (`app/(auth)/register.tsx`) com campos email + password (+ confirmação), validação básica, e link para login
- [ ] Integração com `supabase.auth.signInWithPassword` e `supabase.auth.signUp`
- [ ] Criação automática de registo em `profiles` após signup (trigger Supabase ou chamada explícita)
- [ ] Hook `useAuth` (`src/hooks/useAuth.ts`) expõe estado de sessão (user, loading, signIn, signUp, signOut)
- [ ] Protecção de rotas: grupo `(tabs)` só acessível com sessão activa; sem sessão → redirect para `(auth)/login`
- [ ] Redireccionamento automático para homepage após login/registo bem-sucedido
- [ ] Mensagens de erro tratadas e apresentadas ao utilizador (credenciais inválidas, email já registado, etc.) em pt-PT
- [ ] Estilo visual conforme paleta eMealia: fundo `#1B2632` (bgDark), botões `#FFB162` (primary), texto branco (`textInverted`) sobre fundo escuro; título com `fonts.display` (serif), corpo com `fonts.regular` (sans)
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- Usar `src/lib/supabase.ts` (cliente já configurado, região EU Frankfurt) — não criar novo cliente
- Sessão deve persistir entre reinícios da app (Supabase Auth com `expo-secure-store` para storage do token, conforme já previsto no setup)
- A protecção de rotas em Expo Router faz-se tipicamente num `_layout.tsx` (root ou do grupo `(tabs)`) que verifica o estado de `useAuth` e usa `<Redirect />`
- GDPR: o registo deve capturar consentimento (`gdpr_consent`, `gdpr_consent_at` em `profiles`) — confirmar se isso faz parte desta feature ou de uma feature separada de onboarding/legal
- Cores e fontes devem vir de `src/constants/theme.ts` (tokens `colors` e `fonts`), nunca hardcoded nos componentes
- Considerar se existe app web (Next.js em `apps/web/`) que também precise desta autenticação — a pedir no ticket é focado em mobile, mas o schema e lógica Supabase podem ser partilhados via `@emealia/supabase`

## Fora do escopo
- Login social (Google, Apple, Facebook)
- Recuperação de password ("esqueci-me da password") — pode ser ticket separado
- Verificação de email obrigatória antes de aceder à app
- Ecrãs de onboarding (F02) — apenas o redireccionamento pós-login/registo é considerado aqui
- Autenticação na app web (`apps/web/`)

## Próximo passo
/research Como implementar autenticação com Supabase Auth (email + password) e protecção de rotas em Expo Router, incluindo persistência de sessão e criação do registo em `profiles` após signup?
