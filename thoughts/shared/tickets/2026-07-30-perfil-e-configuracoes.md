---
data: 2026-07-30
status: backlog
prioridade: alta
fase_mvp: sim
---

# Feature: Perfil e Configurações

## Contexto
O ecrã `(tabs)/profile.tsx` existe hoje mas cobre apenas o essencial: plano actual, botão de upgrade/gerir subscrição e link para o dashboard de macros (ver `apps/mobile/app/(tabs)/profile.tsx:49-92`). Falta tudo o resto que a F08/perfil do MVP exige: edição de foto e nome, gestão de filtros dietéticos e idioma, controlo de notificações push por tipo, e — criticamente para lançar na UE — os fluxos GDPR de exportação (Art. 20) e eliminação de conta (Art. 17), que hoje não existem em lado nenhum do código. Sem isto a app não pode ir para produção na App Store/Play Store com utilizadores europeus.

## Comportamento esperado

**Editar nome e foto de perfil**
**Dado que** o utilizador está no ecrã de perfil
**Quando** toca no avatar e escolhe uma foto (via `expo-image-picker`)
**Então** a foto é enviada para Supabase Storage, `avatar_url` é actualizado em `profiles` e reflectido de imediato na UI

**Editar filtros dietéticos**
**Dado que** o utilizador quer alterar as suas preferências dietéticas
**Quando** abre a secção de preferências e (des)selecciona filtros (multi-select, mesmos valores de `FILTROS_DIETETICOS`)
**Então** `filtros_dieteticos` é actualizado em `profiles` e a alteração é reflectida em pesquisa/feed sem reiniciar a app

**Alterar idioma da app**
**Dado que** o utilizador está em português e quer mudar para espanhol (ou vice-versa)
**Quando** selecciona o idioma na secção de preferências
**Então** a app muda de idioma imediatamente e a preferência é guardada (local + `profiles`, para persistir entre dispositivos)

**Gerir notificações push por tipo**
**Dado que** o utilizador tem notificações activas
**Quando** desliga um tipo específico (ex: "sugestões de jantar" mas mantém "alertas de despensa")
**Então** deixa de receber esse tipo específico, preservando os restantes

**Ver e gerir plano**
**Dado que** o utilizador está na secção de plano
**Quando** vê o seu plano actual
**Então** vê nome do plano, data de renovação (se aplicável) e botão de upgrade (free) ou gerir subscrição via RevenueCat (premium) — **esta parte já existe** em `profile.tsx`, apenas precisa de ser integrada no novo ecrã reestruturado

**Exportar dados pessoais (GDPR Art. 20)**
**Dado que** o utilizador quer uma cópia dos seus dados
**Quando** toca em "Exportar os meus dados"
**Então** a app despoleta a recolha de todos os dados do utilizador nas tabelas relevantes (`profiles`, `pantry_items`, `saved_recipes`, `meal_plan`, `shopping_list`) e disponibiliza-os num ficheiro (ex: JSON) para download/partilha

**Eliminar conta (GDPR Art. 17)**
**Dado que** o utilizador quer eliminar a conta permanentemente
**Quando** toca em "Eliminar conta", confirma a acção destrutiva (ex: modal com texto a digitar ou dupla confirmação) e confirma
**Então** todos os registos do utilizador são removidos do Supabase (via `ON DELETE CASCADE` nas tabelas + remoção do próprio `auth.users`), a sessão termina e o utilizador é redireccionado para o ecrã de login/registo

**Logout com confirmação**
**Dado que** o utilizador toca em "Terminar sessão"
**Quando** confirma no diálogo de confirmação
**Então** a sessão Supabase é terminada (`signOut`) e é redireccionado para `(auth)/login`

**Sincronização em tempo real**
**Dado que** qualquer alteração é feita em qualquer secção do ecrã (nome, filtros, idioma, notificações)
**Quando** a alteração é guardada
**Então** é persistida imediatamente em `profiles` no Supabase e reflectida no `profileStore` local sem exigir refresh manual

## Critérios de aceitação
- [ ] Secção Perfil: upload de foto via `expo-image-picker` → Supabase Storage → `avatar_url`; edição de nome; email visível (read-only, gerido pelo Supabase Auth)
- [ ] Secção Preferências: multi-select de filtros dietéticos editável, persistido em `filtros_dieteticos`
- [ ] Secção Preferências: selector de idioma (Português/Español) com efeito imediato na UI e persistência
- [ ] Secção Preferências: toggles de notificações push por tipo (pelo menos: sugestões de jantar, alertas de despensa)
- [ ] Secção Plano: reaproveita lógica actual de `profile.tsx` (plano, data renovação, upgrade/gerir subscrição, restaurar compras)
- [ ] Secção Privacidade: exportação de dados pessoais (GDPR Art. 20) cobrindo todas as tabelas com `user_id`
- [ ] Secção Privacidade: eliminação de conta (GDPR Art. 17) com confirmação destrutiva explícita, remove todos os dados e a conta de auth, termina sessão
- [ ] Logout com diálogo de confirmação
- [ ] Todas as alterações reflectidas em `profileStore`/`profiles` sem necessidade de refresh manual do ecrã
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- **Ecrã actual `apps/mobile/app/(tabs)/profile.tsx`** já implementa a secção de Plano (linhas 49-92) com `useRevenueCat`, `PaywallModal` e `Purchases.showManageSubscriptions()` — reaproveitar, não recriar.
- **Sem bucket de Supabase Storage configurado** — não há nenhuma referência a `supabase.storage` no código. É preciso criar o bucket (ex: `avatars`), política RLS de acesso (utilizador só escreve/lê o seu próprio ficheiro) e decidir path convention (ex: `avatars/{user_id}.jpg`), a confirmar em research.
- **`expo-image-picker` já está instalado** (`apps/mobile/package.json`) mas não tem nenhum uso actual — primeira feature a introduzi-lo.
- **Sem coluna `idioma` em `profiles`** (`supabase/schema.sql:9-22`) — é preciso `ALTER TABLE profiles ADD COLUMN idioma text DEFAULT 'pt-PT' CHECK (idioma IN ('pt-PT','es-ES'))`. Sem infraestrutura de i18n existente na app (nenhum `i18n`/biblioteca de traduções encontrada) — a confirmar em research se se introduz `i18n-js`/`expo-localization` ou equivalente, ou se o MVP faz apenas troca de strings PT/ES num dicionário simples.
- **Notificações por tipo não existem no schema** — hoje só há `expo_push_token` (um único token, tudo-ou-nada, ver `packages/types/src/user.ts:41` e `apps/mobile/src/hooks/usePushNotifications.ts`). É preciso decidir estrutura de preferências por tipo: coluna `jsonb` (ex: `notificacoes_prefs: {"sugestoes_jantar": true, "alertas_despensa": true}`) vs. colunas booleanas separadas — a confirmar em research, e como o envio de notificações (Edge Functions, se existirem) respeita essas preferências.
- **Eliminação de conta requer privilégios de admin** — `auth.admin.deleteUser()` do Supabase exige a `service_role` key, que **nunca pode estar no cliente** (regra 6 do CLAUDE.md). Isto implica criar uma Supabase Edge Function (ex: `delete-account`) que o cliente invoca autenticado, e que internamente elimina o utilizador de `auth.users` (as restantes tabelas já têm `ON DELETE CASCADE` a partir de `profiles`/`auth.users`) — a confirmar arquitectura exacta em research.
- **Exportação de dados (Art. 20)** — decidir em research se a agregação dos dados (`profiles`, `pantry_items`, `saved_recipes`, `meal_plan`, `shopping_list`) é feita no cliente (múltiplas queries directas, já que RLS restringe a dados próprios) ou também via Edge Function; e qual o mecanismo de "download" em React Native (ex: `expo-sharing` + ficheiro JSON temporário) já que não há download de browser.
- **Diálogos de confirmação destrutiva** — não há padrão existente no código para modais de confirmação destrutiva (nem eliminar despensa, nem eliminar receitas parecem ter). A confirmar em research se se usa `Alert.alert` nativo (mais simples, mas menos controlo visual/marca) ou um modal customizado consistente com `theme.ts`.
- **`profileStore`/`useProfile`** (`apps/mobile/src/stores/profileStore.ts`, `apps/mobile/src/hooks/useProfile.ts`) já existem e devem ser estendidos com um método de update (ex: `updateProfile`) que sincroniza optimisticamente a store e o Supabase — seguir o padrão de "não refetch desnecessário" já documentado no hook actual.
- **Lógica de negócio para `packages/`** — segundo a regra do monorepo, chamadas de export/delete/update de perfil devem viver em `@emealia/supabase`, não directamente em `apps/mobile`.

## Fora do escopo
- Alteração de email ou password (gestão de credenciais de auth) — fora desta feature, assume-se fluxo futuro separado
- Suporte a mais idiomas além de Português e Espanhol
- Notificações por tipo além dos dois exemplos mínimos (sugestões de jantar, alertas de despensa) — outros tipos podem ser adicionados depois seguindo o mesmo padrão
- Edge Functions de envio real de notificações push (só o toggle de preferências faz parte desta feature)
- Exportação de dados em formatos além de JSON (ex: PDF, CSV)
- Fluxo de reautenticação antes de eliminar conta (ex: pedir password novamente) — a confirmar se é necessário por segurança em research
- App web (`apps/web/`) — esta feature é apenas mobile

## Próximo passo
/research Como configurar um bucket de Supabase Storage para avatars com RLS por utilizador, se deve existir uma Edge Function `delete-account` para eliminar utilizadores de `auth.users` com `service_role` (dado que o cliente nunca pode ter essa chave), que estrutura de dados usar para preferências de notificação por tipo (`jsonb` vs. colunas), e que abordagem de i18n adoptar para o selector de idioma Português/Español (biblioteca dedicada vs. dicionário simples) tendo em conta que não existe nenhuma infraestrutura de i18n no projecto actualmente.
