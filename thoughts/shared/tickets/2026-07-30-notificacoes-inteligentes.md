---
data: 2026-07-30
status: backlog
prioridade: alta
fase_mvp: sim
---

# Feature: Notificações Inteligentes

## Contexto
A infra-estrutura de push notifications já existe parcialmente no projecto, construída ao longo de features anteriores: `profiles.expo_push_token` e `profiles.notificacoes_prefs` (`supabase/schema.sql:244-251`), o hook `usePushNotifications`/`registerForPush` (`apps/mobile/src/hooks/usePushNotifications.ts`), o toggle de preferências em `NotificationPrefsSection` (`apps/mobile/src/components/profile/NotificationPrefsSection.tsx`) e uma Edge Function que já envia pushes via Expo Push API, `notify-new-video` (`supabase/functions/notify-new-video/index.ts`), disparada por um trigger de Postgres quando `video_cache` recebe um vídeo novo de um criador seguido — ou seja, o tipo (4) "novidades de criadores seguidos" já está implementado.

O que falta é o que dá o nome à feature: as notificações *agendadas* — sugestão de jantar diária, alerta de validade de despensa e lembrete semanal de planeamento — que exigem um mecanismo de scheduling que ainda não existe em lado nenhum do projecto (nem GitHub Actions, nem `pg_cron`), e ligar o pedido de permissão (`registerForPush`, hoje só chamado nos ecrãs de criadores) ao onboarding, como pedido pelo utilizador.

## Comportamento esperado

**Sugestão de jantar diária**
**Dado que** um utilizador tem `notificacoes_prefs.sugestoes_jantar = true` e itens em `pantry_items`
**Quando** chega às 18h00 (hora de Lisboa) e o job diário corre
**Então** a Edge Function consulta os ingredientes da despensa do utilizador, pede uma sugestão de receita à Spoonacular API (via `findByIngredients`, respeitando o cache Redis de 1h) e envia uma push notification com o título da receita sugerida

**Alerta de validade de despensa**
**Dado que** um utilizador tem `notificacoes_prefs.alertas_despensa = true` e um `pantry_items.expira_em` a 3 dias ou menos da data actual (e ainda não notificado)
**Quando** o job diário corre
**Então** o utilizador recebe uma push notification a identificar o(s) ingrediente(s) prestes a expirar

**Lembrete semanal de planeamento (Premium)**
**Dado que** um utilizador tem `profiles.plano != 'free'`
**Quando** chega segunda-feira de manhã e o job semanal corre
**Então** recebe uma push notification a convidar a planear as refeições da semana no Planeador

**Lembrete semanal — utilizador free**
**Dado que** um utilizador tem `profiles.plano = 'free'`
**Quando** o job semanal de segunda-feira corre
**Então** não recebe o lembrete de planeamento (feature exclusiva Premium)

**Pedido de permissão no onboarding**
**Dado que** o utilizador chega ao Passo 3 do onboarding (`apps/mobile/app/onboarding/step3.tsx`)
**Quando** o ecrã é apresentado
**Então** é pedida a permissão do sistema para notificações (via `registerForPush`) e, se concedida, o `expo_push_token` fica gravado no perfil antes de o onboarding terminar

**Utilizador recusa a permissão**
**Dado que** o utilizador nega a permissão de notificações no onboarding
**Quando** o onboarding continua
**Então** o fluxo prossegue normalmente sem bloquear a conclusão (utilizador pode activar mais tarde nas definições do sistema; `notificacoes_prefs` mantém-se com os defaults)

## Critérios de aceitação
- [ ] `registerForPush` (já existente em `usePushNotifications.ts`) é chamado a partir do Passo 3 do onboarding (`step3.tsx`), não só nos ecrãs de criadores
- [ ] Nova chave `lembrete_planeamento` adicionada ao jsonb `notificacoes_prefs` (default `true`) e exposta como toggle em `NotificationPrefsSection`, visível apenas para utilizadores Premium
- [ ] Edge Function `notify-daily-suggestion` (ou nome equivalente): para cada utilizador com `sugestoes_jantar = true` e `expo_push_token` preenchido, consulta `pantry_items`, obtém sugestão via Spoonacular (client já existente) e envia push (reutilizar o padrão de envio de `notify-new-video/index.ts`)
- [ ] Edge Function `notify-pantry-expiry` (ou fundida com a anterior): identifica `pantry_items.expira_em <= hoje + 3 dias` por utilizador com `alertas_despensa = true` e envia push
- [ ] Edge Function `notify-weekly-planner`: para utilizadores com `plano != 'free'` e `lembrete_planeamento = true`, envia push às segundas-feiras
- [ ] Mecanismo de agendamento escolhido e configurado (GitHub Actions scheduled workflow a invocar as Edge Functions via HTTP, ou `pg_cron` + `pg_net` seguindo o padrão já usado no trigger de `notify_creator_followers`) — decisão e configuração final ficam para a fase de research/plan
- [ ] Nenhuma chamada directa a `SPOONACULAR_API_KEY`/`YOUTUBE_API_KEY` a partir do cliente — lógica de sugestão corre inteiramente na Edge Function
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- **Scheduling ainda não existe no projecto**: nem `pg_cron` (só `pg_net` está activo, usado no trigger síncrono de `notify_creator_followers`) nem GitHub Actions (`.github/workflows/` não existe neste repo). A escolha entre `pg_cron` (agenda dentro do próprio Postgres, chama a Edge Function via `pg_net`, mesmo padrão do trigger existente) e GitHub Actions (workflow com `schedule: cron`, fora do Supabase) fica para o research — head-to-head entre as duas abordagens deve considerar: limites do plano Supabase para `pg_cron`, necessidade de segredos (`EXPO_ACCESS_TOKEN`, chaves de serviço) e simplicidade de manutenção solo.
- **Reaproveitar o padrão de envio de push já validado**: `notify-new-video/index.ts` mostra o formato correcto de mensagens para a Expo Push API (lotes de 100, `EXPO_ACCESS_TOKEN`) — as novas Edge Functions devem seguir a mesma estrutura em vez de reinventar.
- **`notificacoes_prefs` já tem 2 das 4 chaves**: `sugestoes_jantar` e `alertas_despensa` já existem em `profiles.notificacoes_prefs` (`supabase/schema.sql:250-251`) e já têm toggle de UI em `NotificationPrefsSection.tsx` — mas nenhuma Edge Function os lê ainda. Falta apenas `lembrete_planeamento` (novo) — "novidades de criadores" (tipo 4) não usa `notificacoes_prefs`, é sempre enviado a quem segue o criador (a confirmar em research se deve passar a respeitar uma preferência também).
- **Tipo (4) já implementado**: a notificação de "novidades de criadores seguidos" foi construída na feature Criadores em Destaque (`supabase/functions/notify-new-video/index.ts` + trigger `on_video_cache_insert`) e não faz parte do trabalho desta ticket — mencionada no pedido original mas já concluída.
- **Sugestão de jantar depende de dados reais de despensa**: se `pantry_items` do utilizador estiver vazio ou não gerar resultados na Spoonacular, definir em research o comportamento (não enviar notificação nesse dia vs. enviar sugestão genérica).
- **Fuso horário**: "18h00" e "segunda-feira de manhã" referem-se a Portugal/Espanha (Europe/Lisbon, Europe/Madrid) — utilizadores não têm campo de fuso horário próprio em `profiles`; a confirmar em research se assume-se um único fuso para todos (mercado inicial) ou se é necessário capturar fuso do dispositivo.
- **`registerForPush` já existe e é reutilizável tal como está** — a alteração no onboarding é apenas de chamar o hook no sítio certo (Passo 3), não recriar lógica de permissão.

## Fora do escopo
- Notificação de tipo (4) "novidades de criadores seguidos" — já implementada em feature anterior
- Notificações in-app (badges, centro de notificações dentro da app) — apenas push do sistema
- Personalização fina de horário pelo utilizador (ex: escolher a hora da sugestão de jantar) — horário fixo (18h00) nesta fase
- Suporte a múltiplos fusos horários por utilizador
- Ecrã equivalente na app web (`apps/web/`) — push notifications são conceito mobile-only nesta fase

## Próximo passo
/research Qual o mecanismo de scheduling mais adequado para as Edge Functions diárias/semanais desta feature (`pg_cron`+`pg_net` seguindo o padrão de `notify_creator_followers`, vs. GitHub Actions com `schedule: cron` a invocar as Edge Functions via HTTP), como estruturar a consulta de sugestão de jantar via Spoonacular a partir de `pantry_items` respeitando o cache de 1h, e como tratar fuso horário único vs. por utilizador para os horários 18h00/segunda-feira de manhã.
