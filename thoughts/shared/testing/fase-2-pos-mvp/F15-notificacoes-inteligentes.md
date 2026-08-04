# F15 — Notificações Inteligentes

Fonte: `thoughts/shared/plans/2026-07-30-notificacoes-inteligentes.md`

## Pré-requisitos
- [ ] ⚠️ Push notifications só funcionam em dispositivo físico (`Device.isDevice` bloqueia em simulador, ver `usePushNotifications.ts:9`) — Expo Go é suficiente para push (ao contrário de F14)
- [ ] SQL corrido: backfill de `notificacoes_prefs` com `lembrete_planeamento`, coluna `pantry_items.alerta_validade_enviado_em` + index `pantry_items_user_expira_idx`, extensão `pg_cron` activa e os 3 jobs agendados
- [ ] Confirmar `SELECT * FROM cron.job;` mostra `notify-daily-suggestion`, `notify-pantry-expiry`, `notify-weekly-planner` com `active = true`
- [ ] As 3 Edge Functions deployadas: `notify-daily-suggestion`, `notify-pantry-expiry`, `notify-weekly-planner`
- [ ] Secrets já existentes no projecto confirmados via `supabase secrets list`: `SUPABASE_URL`, `SERVICE_ROLE_KEY_SUPABASE`, `EXPO_ACCESS_TOKEN`, `SPOONACULAR_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [ ] Conta de teste com `expo_push_token` preenchido (completar onboarding num dispositivo físico e aceitar a permissão de notificações)
- [ ] Conta de teste Premium (para `notify-weekly-planner`, que exclui `plano = 'free'`)
- [ ] `service_role_key` do projecto de desenvolvimento à mão para invocar as funções manualmente via `curl`

## Testes automáticos / de código
- [ ] `npm run typecheck` (raiz do monorepo) sem erros
- [ ] `cd apps/mobile && npm run lint` sem warnings novos
- [ ] `npx supabase functions deploy notify-daily-suggestion` / `notify-pantry-expiry` / `notify-weekly-planner` sem erros
- [ ] Invocar cada função sem `Authorization` → comportamento consistente com as outras Edge Functions do projecto (confirmar se rejeitam ou não — estas três não seguem o padrão JWT de `delete-account`, correm sob `service_role_key` fixo do `pg_cron`)
- [ ] `grep -n "mealType" supabase/functions` não é aplicável aqui (isso é F14) — confirmar antes que `notify-*` functions não referenciam HealthKit/Health Connect por engano

## Testes manuais — onboarding (registo do push token)
- [ ] Completar o onboarding num dispositivo físico → no Passo 3, ao concluir, aparece o diálogo nativo do sistema a pedir permissão de notificações
- [ ] Aceitar a permissão → confirmar em `profiles.expo_push_token` (via Supabase Dashboard) que ficou preenchido
- [ ] Repetir o onboarding com outra conta, **negando** a permissão → onboarding conclui na mesma (`profiles.onboarding_completo = true`), sem crash nem bloqueio, `expo_push_token` continua `null`

## Testes manuais — Edge Function `notify-daily-suggestion` (18h00)
- [ ] Conta de teste com despensa preenchida (≥3 ingredientes) e `notificacoes_prefs.sugestoes_jantar = true` → invocar manualmente via `curl`:
  ```bash
  curl -X POST https://<project>.supabase.co/functions/v1/notify-daily-suggestion \
    -H "Authorization: Bearer <service_role_key>"
  ```
  → push recebida no dispositivo com título "Sugestão de jantar" e o nome de uma receita
- [ ] Conta de teste com despensa **vazia** → invocar a função → esta conta não recebe push (comportamento silencioso, decisão confirmada — não é bug)
- [ ] Conta com `notificacoes_prefs.sugestoes_jantar = false` → invocar a função → não recebe push mesmo com despensa preenchida
- [ ] Conta sem `expo_push_token` (nunca completou onboarding com permissão aceite) → excluída da query, sem erro
- [ ] Correr a função duas vezes seguidas com os mesmos ingredientes → segunda chamada deve responder mais rápido (cache-hit no Redis, TTL 1h) — confirmar via logs da função se possível

## Testes manuais — Edge Function `notify-pantry-expiry` (09h00, deduplicação)
- [ ] Conta de teste com um item de despensa com `expira_em` dentro de 3 dias e `alerta_validade_enviado_em = null` → invocar manualmente:
  ```bash
  curl -X POST https://<project>.supabase.co/functions/v1/notify-pantry-expiry \
    -H "Authorization: Bearer <service_role_key>"
  ```
  → push recebida com título "Alerta de despensa" listando o(s) nome(s) do(s) item(ns)
- [ ] Confirmar em `pantry_items.alerta_validade_enviado_em` que o item ficou marcado com timestamp após o envio
- [ ] **Deduplicação:** correr a função uma segunda vez imediatamente a seguir → o mesmo item **não** gera nova push (já tem `alerta_validade_enviado_em` preenchido)
- [ ] Editar a validade (`expira_em`) desse item na app (online) → confirmar via SQL que `alerta_validade_enviado_em` volta a `null` → correr a função novamente → volta a notificar
- [ ] Item com `expira_em` a mais de 3 dias → não entra na lista de alerta
- [ ] Item com `expira_em = null` → excluído da query (nunca notificado)
- [ ] Conta com `notificacoes_prefs.alertas_despensa = false` → não recebe push mesmo com itens a expirar

## Testes manuais — Edge Function `notify-weekly-planner` (segunda-feira 09h00, só Premium)
- [ ] Conta Premium com `notificacoes_prefs.lembrete_planeamento = true` → invocar manualmente:
  ```bash
  curl -X POST https://<project>.supabase.co/functions/v1/notify-weekly-planner \
    -H "Authorization: Bearer <service_role_key>"
  ```
  → push recebida com título "Planeia a tua semana"
- [ ] Conta `free` → **não** recebe push, mesmo com `lembrete_planeamento = true` (filtro `neq('plano', 'free')`)
- [ ] Conta Premium com `lembrete_planeamento = false` → não recebe push

## Testes manuais — preferências no ecrã de Perfil
- [ ] Conta `free` → no ecrã de Perfil, o toggle "Lembrete de planeamento semanal" **não aparece** (gated por `PLANS[...].features.planeamento_semanal`)
- [ ] Fazer upgrade de teste (ou editar `plano` directamente na BD) para `premium_monthly` → toggle "Lembrete de planeamento semanal" passa a aparecer
- [ ] Ligar/desligar o novo toggle → persiste em `notificacoes_prefs.lembrete_planeamento`, sair e voltar ao ecrã confirma persistência
- [ ] Trocar o idioma do perfil (F13) para Español e English → o novo toggle mostra a tradução correcta ("Recordatorio de planificación semanal" / "Weekly planning reminder")

## Verificação de dados (Supabase)
```sql
-- Preferências e token de push
select id, expo_push_token, notificacoes_prefs, plano
from profiles
where id = '<id de teste>';

-- Estado de deduplicação de alertas de despensa
select id, nome, expira_em, alerta_validade_enviado_em
from pantry_items
where user_id = '<id de teste>'
order by expira_em;

-- Confirmar os jobs agendados
select jobid, jobname, schedule, active from cron.job
where jobname in ('notify-daily-suggestion','notify-pantry-expiry','notify-weekly-planner');
```

## Regressão a vigiar
- `usePantry.ts` (função `update`) foi alterado para repor `alerta_validade_enviado_em` a `null` — retestar o CRUD normal da despensa (F05) para confirmar que editar quantidade/categoria (sem tocar em `expira_em`) não reseta o campo desnecessariamente.
- `NotificationPrefsSection.tsx` ganhou um terceiro toggle condicional — confirmar visualmente que o espaçamento entre os toggles "Sugestões de jantar" / "Alertas de despensa" / "Lembrete de planeamento" está consistente em contas `free` (2 toggles) vs Premium (3 toggles).
- `notify-daily-suggestion` consome orçamento da API Spoonacular (mesmo pool usado por F04 pesquisa por ingredientes) — se o plano gratuito/Basic (50 pontos/dia) estiver perto do limite por causa dos testes manuais desta feature, os testes de F04 no mesmo dia podem falhar por esgotamento de quota, não por bug real.
- **Nota de fuso horário:** os cron jobs estão fixos para horário de verão (WEST, UTC+1). Se os testes forem feitos depois da mudança para hora de inverno (WET), as notificações agendadas chegarão 1h mais tarde do que o esperado — isto é uma limitação conhecida, não um bug a reportar (ver "Notas de Implementação" no plano).
