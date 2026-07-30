---
data: 2026-07-30
feature: "Notificações Inteligentes"
status: completo
---

# Research: Notificações Inteligentes

## Questão de Pesquisa
Qual o mecanismo de scheduling mais adequado para as Edge Functions diárias/semanais desta feature (`pg_cron`+`pg_net` seguindo o padrão de `notify_creator_followers`, vs. GitHub Actions com `schedule: cron` a invocar as Edge Functions via HTTP), como estruturar a consulta de sugestão de jantar via Spoonacular a partir de `pantry_items` respeitando o cache de 1h, e como tratar fuso horário único vs. por utilizador para os horários 18h00/segunda-feira de manhã.

## Sumário
O projecto já tem toda a infra-estrutura de push notifications e o padrão de trigger event-driven via `pg_net` (usado em `notify-new-video`), mas **não tem nenhum mecanismo de scheduling periódico** (`pg_cron` não está instalado; não existe `.github/workflows/`). `pg_cron` é a escolha clara — está disponível de origem em todos os planos Supabase (incluindo free), reaproveita o Vault e o `pg_net` já em uso, e evita as falhas de fiabilidade conhecidas do GitHub Actions cron (atrasos, desactivação automática por inactividade). Falta criar: extensão `pg_cron`, três `cron.schedule(...)` (diário 18h00, diário verificação despensa, semanal segunda-feira), três Edge Functions novas, a chave `lembrete_planeamento` em `notificacoes_prefs`, o toggle correspondente na UI, e a chamada a `registerForPush` no Passo 3 do onboarding.

## Ficheiros Relevantes da Codebase

- `apps/mobile/src/hooks/usePushNotifications.ts` (28 linhas) — hook `registerForPush`: verifica `Device.isDevice`, pede permissão via `expo-notifications`, obtém o token com `getExpoPushTokenAsync` usando `projectId` de `Constants.expoConfig.extra.eas.projectId`, e persiste com `updateProfile(supabase, userId, { expo_push_token: token })`. Reutilizável tal como está — não precisa de alterações.
- `apps/mobile/app/creators/index.tsx:6,17,25` e `apps/mobile/app/creators/[id].tsx:7,22,34` — únicos dois call-sites actuais de `registerForPush`, chamado de forma fire-and-forget dentro de `handleToggleFollow`/`follow`. Confirma que o onboarding **ainda não chama** este hook.
- `apps/mobile/app/onboarding/step3.tsx` (134 linhas) — último passo do onboarding. `handleConcluir` (L34-82) escreve `filtros_dieteticos`, `frequencia_cozinha`, `onboarding_completo: true` no perfil via `updateProfile`, opcionalmente chama `addPantryItems`, e actualiza `useProfileStore`. Navegação implícita: `_layout.tsx` raiz observa `profile.onboarding_completo` e redirecciona via `Stack.Protected`. É aqui que `registerForPush` deve ser chamado, antes ou em paralelo ao `handleConcluir`, sem bloquear a conclusão se a permissão for negada.
- `apps/mobile/app/onboarding/step1.tsx` / `step2.tsx` — padrão simples: `useState` local seeded de `useOnboardingStore`, `toggle()` para selecção, `handleNext()` grava no Zustand e faz `router.push`. Não escrevem no Supabase.
- `apps/mobile/src/components/profile/NotificationPrefsSection.tsx` (51 linhas) — `toggleNotif(chave, valor)` (L18-22) faz spread de `profile.notificacoes_prefs`, chama `updateProfile(supabase, profile.id, { notificacoes_prefs: novo })`, actualiza `useProfileStore`. Apenas dois toggles existentes hoje: `sugestoes_jantar` e `alertas_despensa` (L30-48). É aqui que entra o terceiro toggle `lembrete_planeamento`, visível só para Premium (`profile.plano !== 'free'`).
- `packages/types/src/user.ts:22` — tipo `NotificacoesPrefs` (usado em `Profile.notificacoes_prefs`, linha 52). Precisa de adicionar a chave `lembrete_planeamento?: boolean`.
- `supabase/functions/notify-new-video/index.ts` (72 linhas) — padrão de referência completo para envio de push: lê `video_id`/`creator_channel_id` do body, obtém título/canal, consulta `followed_creators`, obtém `profiles.expo_push_token` desses utilizadores, constrói array de mensagens `{to, sound:'default', title, body}`, e envia em lotes de 100 (L57-67) para `https://exp.host/--/api/v2/push/send` com `Authorization: Bearer ${EXPO_ACCESS_TOKEN}`. **Nota de qualidade:** não há verificação do status da resposta nem polling de receipts — as novas Edge Functions podem replicar tal como está (consistência) ou melhorar isto (decisão para a fase de plan).
- `supabase/functions/search-recipes/index.ts:49-66,103` — único local onde `findByIngredients` é chamado hoje. Constrói params (`ingredients`, `number`, `ranking:'1'`, `ignorePantry:'false'`, `apiKey`), usa Redis (Upstash) com `CACHE_TTL_SECONDS = 3600` e chave `spoonacular:search:<ingredients>:<filtros>:<number>`. Este é o padrão a seguir para a sugestão de jantar diária — mas não existe um "cliente Spoonacular" partilhado (`apps/mobile/src/lib/spoonacular.ts` não existe); a lógica está duplicada dentro de cada Edge Function (`search-recipes`, `autocomplete-ingredients`, `recipe-ingredients`), cada uma com o seu próprio cliente Redis e `CACHE_TTL_SECONDS`.
- `apps/mobile/src/hooks/usePantry.ts` (91 linhas) — CRUD apenas (`getPantry`, `addPantryItem`, `updatePantryItem`, `deletePantryItem`, de `packages/supabase/src/queries/pantry.ts:6`), com fallback offline SQLite. **Não existe nenhuma query de "itens a expirar"** — a única lógica de expiry é o helper client-side `isExpiringSoon()` em `apps/mobile/src/constants/pantry.ts:12-18` (usado só para badges de UI em `PantryItemCard.tsx:57`). O alerta de despensa terá de ser uma query nova, do lado do servidor (Edge Function), sobre `pantry_items.expira_em`.
- `supabase/schema.sql:253-287` — trigger + função `notify_creator_followers()` que usa `pg_net` para chamar `notify-new-video` a partir de um `AFTER INSERT` trigger em `video_cache`. É o precedente directo para qualquer nova invocação de Edge Function via `net.http_post`, incluindo a partir de `cron.schedule`.

## Padrões de Implementação Existentes

**Envio de push em lote (`notify-new-video/index.ts:57-67`):**
```ts
for (let i = 0; i < messages.length; i += 100) {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${EXPO_ACCESS_TOKEN}` },
    body: JSON.stringify(messages.slice(i, i + 100)),
  });
}
```

**Trigger `pg_net` → Edge Function (`schema.sql:261-287`):**
```sql
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION notify_creator_followers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_project_url text;
  v_service_key text;
BEGIN
  IF NEW.creator_channel_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO v_project_url FROM vault.decrypted_secrets WHERE name = 'project_url';
  SELECT decrypted_secret INTO v_service_key FROM vault.decrypted_secrets WHERE name = 'service_role_key';

  PERFORM net.http_post(
    url     := v_project_url || '/functions/v1/notify-new-video',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_service_key),
    body    := jsonb_build_object('video_id', NEW.id, 'creator_channel_id', NEW.creator_channel_id)
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_video_cache_insert ON video_cache;
CREATE TRIGGER on_video_cache_insert
  AFTER INSERT ON video_cache
  FOR EACH ROW EXECUTE FUNCTION notify_creator_followers();
```
Este mesmo padrão (Vault para `project_url`/`service_role_key`, `net.http_post` com header `Authorization: Bearer`) é reutilizável directamente dentro de um job `cron.schedule`, substituindo o `AFTER INSERT` por um agendamento (ver secção de scheduling abaixo).

**Cache Spoonacular (`search-recipes/index.ts`):** Redis (Upstash) com TTL fixo de 3600s, chave composta por parâmetros normalizados. Padrão a replicar na nova função de sugestão de jantar, com chave incluindo `user_id` ou lista de ingredientes da despensa desse utilizador.

## Tabelas/Queries Supabase Relevantes

Toda a definição vive num único ficheiro `supabase/schema.sql` (338 linhas) — **não existe sistema de migrations**; alterações são coladas manualmente no SQL Editor do Supabase. Não há `supabase/migrations/` nem `supabase/seed.sql`.

**`profiles`** (`schema.sql:9-22`, RLS `24-28`):
- `expo_push_token text` (`244-245`) — nullable, sem default.
- `notificacoes_prefs jsonb NOT NULL DEFAULT '{"sugestoes_jantar": true, "alertas_despensa": true}'::jsonb` (`250-251`) — sem CHECK constraint na forma; convenção do projecto para jsonb é free-form. Precisa de ganhar a chave `lembrete_planeamento` (default `true`), possivelmente via `UPDATE profiles SET notificacoes_prefs = notificacoes_prefs || '{"lembrete_planeamento": true}'::jsonb WHERE NOT (notificacoes_prefs ? 'lembrete_planeamento')` como backfill, já que não há CHECK a impedir chaves em falta.
- `plano text DEFAULT 'free'` — usado para o gate Premium do lembrete semanal.

**`pantry_items`** (`schema.sql:47-69`, RLS `59-61`): `expira_em date` nullable, sem index dedicado — `pantry_items_user_id_idx ON pantry_items(user_id)` (`63`) é o único index. **Recomenda-se adicionar um index em `expira_em`** (ou composto `(user_id, expira_em)`) para a query diária de "itens a expirar em ≤3 dias" não fazer table scan à medida que a tabela cresce.

**`meal_plan`** (`schema.sql:99-125`, RLS `113-115`): usado para verificar se o utilizador já tem plano da semana (opcional, para decidir se envia o lembrete semanal só a quem ainda não planeou — não pedido explicitamente no ticket, mas possível refinamento).

**RLS / bypass:** todas as tabelas de utilizador seguem `FOR ALL USING (auth.uid() = user_id/id)`. `video_cache` e `creators` não têm RLS (dados partilhados). Edge Functions usam a service_role key (`SERVICE_ROLE_KEY_SUPABASE`, ver `notify-new-video/index.ts:5,8`) para ignorar RLS e consultar entre utilizadores — as três novas Edge Functions devem seguir o mesmo padrão para poder iterar sobre todos os `profiles` elegíveis.

**Edge Functions existentes** (`supabase/functions/`): `autocomplete-ingredients`, `delete-account`, `notify-new-video`, `recipe-ingredients`, `revenuecat-webhook`, `search-recipes`, `sync-creator`, `youtube-feed` — todas `Deno.serve()` num único `index.ts`.

## APIs Externas Relevantes

**Scheduling — `pg_cron` vs GitHub Actions:**
- `pg_cron` e `pg_net` vêm activados por omissão em todos os planos Supabase (incluindo free), com UI "Supabase Cron" no dashboard construída sobre `pg_cron`. Recomenda-se máx. 8 jobs concorrentes e 10 min por job. Configuração: segredos no Vault (já em uso), `cron.schedule('nome-job', '<cron-expr>', $$ select net.http_post(...) $$)`.
- GitHub Actions `schedule: cron` tem problemas de fiabilidade documentados: atrasos de 5–30 min sob carga, desactivação automática de workflows após ~60 dias de inactividade do repo, deprioritização em repos/contas novas, e recomendação de não correr mais frequente que 15 min no tier gratuito de repos públicos. Precisaria de secret novo no GitHub (`EXPO_ACCESS_TOKEN` ou service-role key) e manutenção de YAML separado.
- **Recomendação:** `pg_cron` + `pg_net` — zero infra nova, reutiliza Vault e o padrão já validado em `notify_creator_followers`, evita as armadilhas de fiabilidade do GitHub Actions.

**Expo Push API:**
- Lote máximo continua **100 mensagens por request** para `POST https://exp.host/--/api/v2/push/send` (excesso → erro `PUSH_TOO_MANY_NOTIFICATIONS`); `expo-server-sdk-node` faz chunking automático se se preferir usar o SDK em vez de `fetch` cru.
- Com push security activo, todos os pedidos precisam de `Authorization: Bearer ${EXPO_ACCESS_TOKEN}` (gerado em expo.dev/accounts/.../access-tokens) — já usado em `notify-new-video`.
- Padrão ticket → receipt: enviar devolve "tickets"; confirmação real de entrega exige chamada separada a `POST .../getReceipts` (máx. 1000 IDs/pedido) cerca de 15 min depois; receipts expiram em 24h.
- Erro `DeviceNotRegistered` num receipt implica limpar/desactivar esse `expo_push_token` na BD para não continuar a enviar para um dispositivo desinstalado — **não implementado hoje em `notify-new-video`**, ponderar se as novas funções devem tratar isto (nice-to-have, não bloqueante).
- Throughput ~600 notificações/seg por projecto Expo.

**Spoonacular `findByIngredients`:**
- `GET https://api.spoonacular.com/recipes/findByIngredients` — params: `ingredients` (CSV), `number` (1–100, default 10), `ranking` (1=maximizar usados, 2=minimizar em falta), `ignorePantry` (exclui staples como sal/água/farinha do cálculo de "em falta").
- Resposta: array de `{id, title, image, likes, usedIngredientCount, usedIngredients[], missedIngredientCount, missedIngredients[], unusedIngredients[]}`.
- Custo: 1 ponto + 0.01/receita devolvida (`number=10` ≈ 1.1 pontos). Plano gratuito/Basic: **50 pontos/dia**, 1 req/s, 2 concorrentes — orçamento muito apertado, reforça a obrigatoriedade do cache de 1h já em vigor no projecto. Planos pagos escalam até 10.000 pontos/dia (Chef, $149/mês).

## Code Snippets de Referência

Ver secção "Padrões de Implementação Existentes" acima para os dois snippets principais (envio de push em lote e trigger `pg_net`) — ambos directamente reutilizáveis nas três novas Edge Functions.

## Questões em Aberto

1. **Mecanismo de scheduling:** research recomenda `pg_cron` + `pg_net`, mas a decisão final e a configuração exacta (nomes dos jobs, expressões cron) ficam para a fase de `/plan`.
2. **Fuso horário:** confirmar se se assume um único fuso (Europe/Lisbon) para todos os utilizadores nesta fase — `profiles` não tem coluna de fuso horário e o ticket já define isto como fora do escopo (multi-fuso), mas a expressão `cron.schedule` terá de ser calculada tendo em conta que o Postgres normalmente corre em UTC (confirmar `SHOW timezone` do projecto Supabase, e ajustar a expressão cron para compensar o offset Portugal/Espanha, incluindo horário de verão).
3. **Comportamento quando a despensa está vazia ou a Spoonacular não devolve resultados:** o ticket deixa em aberto se não enviar notificação nesse dia vs. enviar sugestão genérica — decisão de produto para a fase de plan.
4. **Deduplicação de alertas de despensa:** o ticket menciona "e ainda não notificado" para o alerta de validade — precisa de decidir onde guardar o estado "já notificado" (nova coluna em `pantry_items`, ex. `alerta_validade_enviado_em`, ou tabela de log separada) já que não existe hoje nenhum mecanismo de tracking de notificações enviadas.
5. **Tratamento de erro e `DeviceNotRegistered`:** decidir se as três novas funções devem implementar o padrão ticket→receipt e limpeza de tokens inválidos, ou replicar o padrão simplificado (sem verificação) já existente em `notify-new-video` por consistência — e se compensa retroactivamente melhorar `notify-new-video` na mesma iteração.
6. **Index em `pantry_items.expira_em`:** não existe hoje; decidir se se adiciona (`CREATE INDEX ... ON pantry_items(user_id, expira_em)`) como parte desta feature, dado que a query diária de despensa vai fazer scan por esta coluna para todos os utilizadores.
7. **Cliente Spoonacular partilhado:** hoje a lógica está duplicada em cada Edge Function (`search-recipes`, `autocomplete-ingredients`, `recipe-ingredients`) sem um cliente comum — decidir em plan se a nova função `notify-daily-suggestion` duplica o padrão mais uma vez ou se é o momento de extrair um helper partilhado dentro de `supabase/functions/_shared/` (Deno permite import relativo entre functions).
8. **Fusão de `notify-pantry-expiry` com `notify-daily-suggestion`:** o ticket sugere possivelmente fundir as duas (mesma cron diária, mesmo horário) — decidir uma vs. duas Edge Functions separadas na fase de plan.
