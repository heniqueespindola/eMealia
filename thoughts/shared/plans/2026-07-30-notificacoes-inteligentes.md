---
data: 2026-07-30
feature: "Notificações Inteligentes"
research: "thoughts/shared/research/2026-07-30-notificacoes-inteligentes.md"
status: completo
---

# Spec: Notificações Inteligentes

## Visão Geral
Implementa as três notificações agendadas em falta (sugestão de jantar às 18h00, alerta de validade de despensa de manhã, lembrete semanal de planeamento Premium às segundas-feiras) via `pg_cron` + `pg_net` chamando três novas Edge Functions, liga `registerForPush` ao Passo 3 do onboarding, e adiciona o terceiro toggle de preferências (`lembrete_planeamento`) à UI de perfil.

## Decisões desta fase (confirmadas com o utilizador)
1. **Jobs separados**: `notify-daily-suggestion` (18h00 Lisboa) e `notify-pantry-expiry` (09h00 Lisboa) são duas Edge Functions e dois cron jobs distintos — não fundidas.
2. **Despensa vazia / sem resultados Spoonacular**: não enviar notificação nesse dia para esse utilizador (silencioso, sem mensagem genérica).
3. **Deduplicação do alerta de despensa**: nova coluna `pantry_items.alerta_validade_enviado_em` (timestamptz nullable), sem tabela de log separada.

## Decisões técnicas adicionais (sem impacto de produto — decididas nesta fase)
- **Scheduling**: `pg_cron` + `pg_net`, reutilizando os secrets `project_url`/`service_role_key` já no Vault (mesmo padrão de `notify_creator_followers` em `supabase/schema.sql:261-287`). Não é necessário nenhum secret novo no Vault.
- **Fuso horário**: assume-se um único fuso (Europe/Lisbon) para todos os utilizadores, conforme já definido como fora de escopo no ticket. `pg_cron` (versão standard, sem coluna de timezone por job) corre em UTC — as expressões cron abaixo estão calculadas para **horário de verão (WEST, UTC+1)**, que é o que está em vigor na data desta spec (2026-07-30). Isto fica documentado como limitação conhecida na secção "Notas de Implementação" — não é feito nenhum ajuste automático para hora de inverno (WET, UTC+0) nesta fase.
- **Cliente Spoonacular**: a nova função `notify-daily-suggestion` duplica a chamada a `findByIngredients` (só, sem `informationBulk` — só precisamos do título para a push) em vez de extrair um helper partilhado para `supabase/functions/_shared/`, seguindo o padrão já estabelecido nas outras três Edge Functions que duplicam esta lógica (`search-recipes`, `autocomplete-ingredients`, `recipe-ingredients`) — não introduz uma abstração nova nesta fase.
- **Tratamento de erro / `DeviceNotRegistered`**: as três novas funções replicam o padrão simplificado já usado em `notify-new-video/index.ts` (envio em lotes de 100, sem polling de receipts, sem limpeza de tokens inválidos). Não é feita nenhuma melhoria retroactiva a `notify-new-video` nesta iteração.
- **Toggle Premium**: `lembrete_planeamento` reutiliza o feature flag já existente `PLANS[profile.plano].features.planeamento_semanal` (`packages/config/src/index.ts`) em vez de criar uma chave nova em `PLANS`, já que é literalmente o lembrete da mesma feature de planeamento semanal.
- **Reset do alerta de despensa ao editar validade**: quando o utilizador edita `expira_em` de um item (online), `alerta_validade_enviado_em` é reposto a `null` para o item voltar a ser elegível para alerta. Esta reposição só acontece no caminho online (`usePantry.ts`); a cache SQLite offline (`pantryCache.ts`) não guarda esta coluna (ver Notas de Implementação) — não bloqueia o critério de aceitação, é apenas uma melhoria de UX complementar.

## Ficheiros a Modificar

### `supabase/schema.sql`
**Modificações (adicionar ao fim do ficheiro, nova secção `─── F15 — Notificações Inteligentes`):**

1. Adicionar a chave `lembrete_planeamento` ao default e fazer backfill dos perfis existentes:
```sql
ALTER TABLE profiles ALTER COLUMN notificacoes_prefs SET DEFAULT
  '{"sugestoes_jantar": true, "alertas_despensa": true, "lembrete_planeamento": true}'::jsonb;

UPDATE profiles
SET notificacoes_prefs = notificacoes_prefs || '{"lembrete_planeamento": true}'::jsonb
WHERE NOT (notificacoes_prefs ? 'lembrete_planeamento');
```

2. Nova coluna de deduplicação + index composto em `pantry_items`:
```sql
ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS alerta_validade_enviado_em timestamptz;

CREATE INDEX IF NOT EXISTS pantry_items_user_expira_idx ON pantry_items(user_id, expira_em);
```

3. Activar `pg_cron` e agendar os três jobs, reutilizando os secrets já existentes no Vault (`project_url`, `service_role_key`):
```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-daily-suggestion') THEN
    PERFORM cron.unschedule('notify-daily-suggestion');
  END IF;
END $$;

SELECT cron.schedule(
  'notify-daily-suggestion',
  '0 17 * * *', -- 18h00 Europe/Lisbon (WEST, UTC+1) — ajustar para '0 18 * * *' em horário de inverno (WET)
  $$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/notify-daily-suggestion',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body    := '{}'::jsonb
  );
  $$
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-pantry-expiry') THEN
    PERFORM cron.unschedule('notify-pantry-expiry');
  END IF;
END $$;

SELECT cron.schedule(
  'notify-pantry-expiry',
  '0 8 * * *', -- 09h00 Europe/Lisbon (WEST, UTC+1) — ajustar para '0 9 * * *' em horário de inverno (WET)
  $$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/notify-pantry-expiry',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body    := '{}'::jsonb
  );
  $$
);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-weekly-planner') THEN
    PERFORM cron.unschedule('notify-weekly-planner');
  END IF;
END $$;

SELECT cron.schedule(
  'notify-weekly-planner',
  '0 8 * * 1', -- Segunda-feira 09h00 Europe/Lisbon (WEST, UTC+1) — ajustar para '0 9 * * 1' em horário de inverno (WET)
  $$
  SELECT net.http_post(
    url     := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url') || '/functions/v1/notify-weekly-planner',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')),
    body    := '{}'::jsonb
  );
  $$
);
```

**Depois de colar no SQL Editor do Supabase**, confirmar que os três jobs aparecem em `SELECT * FROM cron.job;`.

---

### `packages/types/src/user.ts`
**Modificações:**
- Linha 22-25 (`NotificacoesPrefs`): adicionar a chave `lembrete_planeamento: boolean;`
```typescript
export interface NotificacoesPrefs {
  sugestoes_jantar:    boolean;
  alertas_despensa:    boolean;
  lembrete_planeamento: boolean;
}
```

---

### `packages/types/src/pantry.ts`
**Modificações:**
- Linha 3-13 (`PantryItem`): adicionar `alerta_validade_enviado_em?: string | null;` como campo **opcional** (não `alerta_validade_enviado_em: string | null;` sem `?`) — importante porque, ao ser opcional, o tipo `Insert` derivado em `database.ts` (via `Omit<PantryItem, ...>`) herda automaticamente a opcionalidade sem precisar de nenhuma alteração em `database.ts`, e a cache SQLite offline (`pantryCache.ts`) — que não vai guardar esta coluna — continua válida em termos de tipos.
```typescript
export interface PantryItem {
  id:         string;
  user_id:    string;
  nome:       string;
  quantidade: string | null;
  barcode:    string | null;
  categoria:  CategoriaDespensa;
  expira_em:  string | null;
  created_at: string;
  updated_at: string;
  alerta_validade_enviado_em?: string | null;
}
```

**Nenhuma alteração necessária em `packages/types/src/database.ts`** — o tipo `Insert` de `pantry_items` (`database.ts:25`) usa `Omit<PantryItem, ...>`, que preserva a opcionalidade do novo campo automaticamente.

---

### `apps/mobile/src/hooks/usePantry.ts`
**Modificações:**
- Função `update` (linhas 58-71): antes de chamar `updatePantryItem` no caminho online, se `updates` incluir `expira_em`, repor `alerta_validade_enviado_em: null` para o item voltar a ser elegível para o alerta de validade na próxima corrida do job `notify-pantry-expiry`.
```typescript
async function update(id: string, updates: Partial<PantryItem>) {
  if (isOffline) {
    const updated = await pantryCache.updateOffline(id, updates);
    if (updated) usePantryStore.getState().updateItem(updated);
    return;
  }

  const finalUpdates = 'expira_em' in updates
    ? { ...updates, alerta_validade_enviado_em: null }
    : updates;

  const { data, error } = await updatePantryItem(supabase!, id, finalUpdates);
  if (error) { console.error('[usePantry] updatePantryItem falhou:', error); return; }
  if (data) {
    usePantryStore.getState().updateItem(data);
    await pantryCache.upsertCachedItem(data);
  }
}
```
Não alterar o caminho `isOffline` — a cache SQLite (`pantry_items_cache`) não tem a coluna `alerta_validade_enviado_em` (ver Notas de Implementação), pelo que a reposição do alerta ao editar validade offline não é replicada nesta fase.

---

### `apps/mobile/app/onboarding/step3.tsx`
**Modificações:**
- Linha 3-15: adicionar import `import { usePushNotifications } from '@/hooks/usePushNotifications';`
- Linha 17-26: instanciar o hook: `const { registerForPush } = usePushNotifications();`
- Dentro de `handleConcluir` (linhas 34-82), depois do bloco `if (updateError || !updatedProfile) { ...; return; }` (linha 58) e antes do bloco de `addPantryItems` (linha 60), adicionar a chamada não-bloqueante:
```typescript
      try {
        await registerForPush(user.id);
      } catch (err) {
        console.error('[onboarding] registerForPush falhou:', err);
        // Não bloqueia o onboarding — utilizador pode activar notificações mais tarde nas definições do sistema.
      }
```
**Critério de aceitação coberto:** permissão do sistema é pedida no Passo 3; se negada ou se `registerForPush` rejeitar, o fluxo de `handleConcluir` continua normalmente (o `try/catch` local isola esta chamada do `try/catch` externo que trata erros de `updateProfile`/`addPantryItems`).

---

### `apps/mobile/src/components/profile/NotificationPrefsSection.tsx`
**Modificações:**
- Linha 2: adicionar import `import { PLANS } from '@emealia/config';`
- Linha 40-48 (bloco `alertas_despensa`): adicionar `marginBottom: spacing.sm` ao `style` do `View` (estava sem margin, ficava colado ao próximo elemento — necessário agora que passa a haver um terceiro toggle a seguir):
```tsx
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }}>
        <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textInverted }}>
          {t('profile.notifAlertasDespensa')}
        </Text>
        <Switch
          value={profile.notificacoes_prefs.alertas_despensa}
          onValueChange={(v) => toggleNotif('alertas_despensa', v)}
        />
      </View>
```
- Depois desse bloco (antes do `</Card>` de fecho, linha 49-50), adicionar o novo toggle, visível apenas para utilizadores Premium (reutiliza o feature flag `planeamento_semanal` já existente):
```tsx
      {PLANS[profile.plano].features.planeamento_semanal && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontFamily: fonts.regular, fontSize: 15, color: colors.textInverted }}>
            {t('profile.notifLembretePlaneamento')}
          </Text>
          <Switch
            value={profile.notificacoes_prefs.lembrete_planeamento}
            onValueChange={(v) => toggleNotif('lembrete_planeamento', v)}
          />
        </View>
      )}
```

---

### `apps/mobile/src/i18n/translations/pt.ts`
**Modificações:**
- Linha 94, no final do trecho `notificacoes: 'Notificações', notifSugestoesJantar: 'Sugestões de jantar', notifAlertasDespensa: 'Alertas de despensa',` adicionar, na mesma linha: ` notifLembretePlaneamento: 'Lembrete de planeamento semanal',`

### `apps/mobile/src/i18n/translations/es.ts`
**Modificações:**
- Linha 96, no final do trecho `notificacoes: 'Notificaciones', notifSugestoesJantar: 'Sugerencias de cena', notifAlertasDespensa: 'Alertas de despensa',` adicionar, na mesma linha: ` notifLembretePlaneamento: 'Recordatorio de planificación semanal',`

### `apps/mobile/src/i18n/translations/en.ts`
**Modificações:**
- Linha 96, no final do trecho `notificacoes: 'Notifications', notifSugestoesJantar: 'Dinner suggestions', notifAlertasDespensa: 'Pantry alerts',` adicionar, na mesma linha: ` notifLembretePlaneamento: 'Weekly planning reminder',`

---

## Ficheiros a Criar

### `supabase/functions/notify-daily-suggestion/index.ts`
**Propósito:** corre às 18h00 (job `notify-daily-suggestion`); para cada utilizador com `notificacoes_prefs.sugestoes_jantar = true` e `expo_push_token` preenchido, consulta os nomes dos seus `pantry_items`, pede uma sugestão à Spoonacular (`findByIngredients`, cache Redis 1h, mesma chave/TTL do padrão de `search-recipes`), e envia uma push com o título da receita. Se a despensa estiver vazia ou a Spoonacular não devolver resultados, não envia nada a esse utilizador (decisão confirmada).

**Conteúdo:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Redis } from 'https://esm.sh/@upstash/redis@1.31.2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const EXPO_ACCESS_TOKEN         = Deno.env.get('EXPO_ACCESS_TOKEN')!;
const SPOONACULAR_API_KEY       = Deno.env.get('SPOONACULAR_API_KEY')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);
const redis = new Redis({
  url:   Deno.env.get('UPSTASH_REDIS_REST_URL')!,
  token: Deno.env.get('UPSTASH_REDIS_REST_TOKEN')!,
});
const CACHE_TTL_SECONDS = 3600; // 1 hora — obrigatório por ToS Spoonacular

async function sugerirReceita(ingredientes: string[]): Promise<string | null> {
  const cacheKey = `spoonacular:daily-suggestion:${[...ingredientes].sort().join(',')}`;

  const cached = await redis.get<string | null>(cacheKey);
  if (cached !== undefined) return cached;

  const params = new URLSearchParams({
    ingredients:  ingredientes.join(','),
    number:       '1',
    ranking:      '1',
    ignorePantry: 'false',
    apiKey:       SPOONACULAR_API_KEY,
  });
  const res  = await fetch(`https://api.spoonacular.com/recipes/findByIngredients?${params}`);
  const data = await res.json();

  const titulo = Array.isArray(data) && data.length > 0 ? data[0].title as string : null;
  await redis.set(cacheKey, titulo, { ex: CACHE_TTL_SECONDS });
  return titulo;
}

serve(async (_req) => {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, expo_push_token')
    .not('expo_push_token', 'is', null)
    .filter('notificacoes_prefs->>sugestoes_jantar', 'eq', 'true');

  const messages: { to: string; sound: string; title: string; body: string }[] = [];

  for (const profile of profiles ?? []) {
    const { data: pantryItems } = await supabaseAdmin
      .from('pantry_items')
      .select('nome')
      .eq('user_id', profile.id);

    const ingredientes = (pantryItems ?? []).map((i) => i.nome);
    if (ingredientes.length === 0) continue;

    const titulo = await sugerirReceita(ingredientes);
    if (!titulo) continue;

    messages.push({
      to:    profile.expo_push_token,
      sound: 'default',
      title: 'Sugestão de jantar',
      body:  `Hoje podes cozinhar: ${titulo}`,
    });
  }

  // Expo aceita até 100 mensagens por pedido
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return new Response(JSON.stringify({ ok: true, notified: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

### `supabase/functions/notify-pantry-expiry/index.ts`
**Propósito:** corre de manhã (job `notify-pantry-expiry`); para cada utilizador com `notificacoes_prefs.alertas_despensa = true`, identifica `pantry_items` com `expira_em <= hoje + 3 dias` e `alerta_validade_enviado_em IS NULL`, envia uma push a listar os nomes, e marca esses itens como notificados.

**Conteúdo:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const EXPO_ACCESS_TOKEN         = Deno.env.get('EXPO_ACCESS_TOKEN')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

serve(async (_req) => {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, expo_push_token')
    .not('expo_push_token', 'is', null)
    .filter('notificacoes_prefs->>alertas_despensa', 'eq', 'true');

  const limite = new Date();
  limite.setDate(limite.getDate() + 3);
  const limiteStr = limite.toISOString().slice(0, 10);

  const messages: { to: string; sound: string; title: string; body: string }[] = [];
  const notificadoIds: string[] = [];

  for (const profile of profiles ?? []) {
    const { data: itens } = await supabaseAdmin
      .from('pantry_items')
      .select('id, nome')
      .eq('user_id', profile.id)
      .not('expira_em', 'is', null)
      .lte('expira_em', limiteStr)
      .is('alerta_validade_enviado_em', null);

    if (!itens || itens.length === 0) continue;

    messages.push({
      to:    profile.expo_push_token,
      sound: 'default',
      title: 'Alerta de despensa',
      body:  `${itens.map((i) => i.nome).join(', ')} vão expirar em breve`,
    });
    notificadoIds.push(...itens.map((i) => i.id));
  }

  // Expo aceita até 100 mensagens por pedido
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  if (notificadoIds.length > 0) {
    await supabaseAdmin
      .from('pantry_items')
      .update({ alerta_validade_enviado_em: new Date().toISOString() })
      .in('id', notificadoIds);
  }

  return new Response(JSON.stringify({ ok: true, notified: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

### `supabase/functions/notify-weekly-planner/index.ts`
**Propósito:** corre às segundas-feiras de manhã (job `notify-weekly-planner`); envia uma push a convidar a planear a semana apenas a utilizadores `plano != 'free'` com `notificacoes_prefs.lembrete_planeamento = true` e `expo_push_token` preenchido.

**Conteúdo:**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY_SUPABASE = Deno.env.get('SERVICE_ROLE_KEY_SUPABASE')!;
const EXPO_ACCESS_TOKEN         = Deno.env.get('EXPO_ACCESS_TOKEN')!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY_SUPABASE);

serve(async (_req) => {
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('expo_push_token')
    .not('expo_push_token', 'is', null)
    .neq('plano', 'free')
    .filter('notificacoes_prefs->>lembrete_planeamento', 'eq', 'true');

  const messages = (profiles ?? []).map((p) => ({
    to:    p.expo_push_token,
    sound: 'default',
    title: 'Planeia a tua semana',
    body:  'Já sabes o que vais cozinhar esta semana? Organiza o teu planeador.',
  }));

  // Expo aceita até 100 mensagens por pedido
  for (let i = 0; i < messages.length; i += 100) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(messages.slice(i, i + 100)),
    });
  }

  return new Response(JSON.stringify({ ok: true, notified: messages.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

---

## Fases de Implementação

### Fase 1: Base de dados e tipos
**Ficheiros:**
- Modificar `supabase/schema.sql` (secção 1 e 2: backfill `notificacoes_prefs`, coluna + index em `pantry_items` — **não** colar ainda a secção 3 de `pg_cron`, ver Fase 2)
- Modificar `packages/types/src/user.ts`
- Modificar `packages/types/src/pantry.ts`

**Critérios de sucesso (automáticos):**
- [x] `npm run typecheck` passa sem erros (o `NotificationPrefsSection.tsx` e o `usePantry.ts` só serão editados na Fase 3, mas os tipos já têm de compilar isoladamente)

**Critérios de sucesso (manuais):**
- [x] Colar as secções 1 e 2 do SQL no Supabase SQL Editor; confirmar com `SELECT notificacoes_prefs FROM profiles LIMIT 5;` que todos os perfis têm a chave `lembrete_planeamento`
- [x] Confirmar `\d pantry_items` (ou equivalente no Table Editor) mostra a coluna `alerta_validade_enviado_em` e o index `pantry_items_user_expira_idx`

### Fase 2: Edge Functions + scheduling
**Ficheiros:**
- Criar `supabase/functions/notify-daily-suggestion/index.ts`
- Criar `supabase/functions/notify-pantry-expiry/index.ts`
- Criar `supabase/functions/notify-weekly-planner/index.ts`
- Colar a secção 3 (`pg_cron`) de `supabase/schema.sql` no SQL Editor

**Critérios de sucesso (automáticos):**
- [x] `npx supabase functions deploy notify-daily-suggestion`, `notify-pantry-expiry`, `notify-weekly-planner` sem erros
- [x] Confirmar secrets já existentes no projecto Supabase (`supabase secrets list`): `SUPABASE_URL`, `SERVICE_ROLE_KEY_SUPABASE`, `EXPO_ACCESS_TOKEN`, `SPOONACULAR_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — todos já usados por `notify-new-video`/`search-recipes`, não é necessário criar nenhum novo

**Critérios de sucesso (manuais):**
- [x] `SELECT * FROM cron.job;` mostra os três jobs (`notify-daily-suggestion`, `notify-pantry-expiry`, `notify-weekly-planner`) com `active = true`
- [x] Invocar manualmente cada função via `curl -X POST https://<project>.supabase.co/functions/v1/notify-daily-suggestion -H "Authorization: Bearer <service_role_key>"` (e equivalente para as outras duas) com um utilizador de teste que tenha `expo_push_token` e despensa preenchida — confirmar recepção da push no dispositivo
- [x] Testar o caso "despensa vazia": utilizador de teste sem `pantry_items` não recebe push de `notify-daily-suggestion`
- [x] Testar deduplicação: correr `notify-pantry-expiry` duas vezes seguidas — o item já notificado não gera uma segunda push nem aparece uma segunda vez na lista

### Fase 3: Cliente mobile — onboarding, preferências, i18n
**Ficheiros:**
- Modificar `apps/mobile/app/onboarding/step3.tsx`
- Modificar `apps/mobile/src/components/profile/NotificationPrefsSection.tsx`
- Modificar `apps/mobile/src/hooks/usePantry.ts`
- Modificar `apps/mobile/src/i18n/translations/pt.ts`, `es.ts`, `en.ts`

**Critérios de sucesso (automáticos):**
- [x] `npm run typecheck` (raiz do monorepo) passa sem erros
- [x] `expo lint` sem warnings novos

**Critérios de sucesso (manuais):**
- [x] Completar o onboarding num dispositivo físico (simulador não pede permissão de push) — confirmar que o diálogo do sistema aparece no Passo 3 e que, ao aceitar, `profiles.expo_push_token` fica preenchido
- [x] Repetir negando a permissão — confirmar que o onboarding conclui na mesma e `profiles.onboarding_completo` fica `true`
- [x] No ecrã de Perfil, com um utilizador `plano = 'free'`: confirmar que o toggle "Lembrete de planeamento semanal" **não aparece**
- [x] Fazer upgrade de teste para `premium_monthly` (ou editar `plano` directamente na BD para teste): confirmar que o toggle aparece e que ligar/desligar persiste em `notificacoes_prefs.lembrete_planeamento`
- [x] Editar a data de validade (`expira_em`) de um item de despensa já notificado (online) — confirmar via SQL Editor que `alerta_validade_enviado_em` volta a `null` para esse item
- [x] Trocar o idioma do perfil para `es-ES` e `en` — confirmar que o novo toggle mostra a tradução correcta

## Estratégia de Testes
- **Automático:** `npm run typecheck` na raiz do monorepo cobre `packages/types`, `apps/mobile`. As Edge Functions (Deno) não têm testes automatizados no projecto — seguem o padrão existente (`notify-new-video`, `search-recipes` também não têm).
- **Manual:** invocação directa das três Edge Functions via `curl` com service role key (ver critérios da Fase 2) antes de depender inteiramente do `pg_cron`; teste end-to-end do onboarding num dispositivo físico (obrigatório — `Device.isDevice` em `usePushNotifications.ts:9` bloqueia em simulador).

## Notas de Implementação

- **Deriva de fuso horário (WEST/WET):** as expressões cron estão fixas para horário de verão (UTC+1). Quando Portugal/Espanha mudarem para hora de inverno (habitualmente último domingo de Outubro), as notificações vão chegar 1 hora mais tarde do que o pretendido (19h00 em vez de 18h00, etc.) até as expressões serem manualmente actualizadas no SQL Editor (`SELECT cron.alter_job(job_id, schedule := '...')` ou re-colar a secção 3 do schema com os cron strings ajustados). Fica documentado como limitação conhecida — resolução automática (ex: migrar para um scheduler com suporte nativo a timezone) fica fora de escopo desta feature.
- **Orçamento Spoonacular:** plano gratuito/Basic = 50 pontos/dia. `notify-daily-suggestion` consome ~1 ponto por utilizador elegível **sem cache-hit**; a cache Redis (chave por conjunto de ingredientes, TTL 1h) reduz custos quando vários utilizadores têm despensas semelhantes, mas com a base de utilizadores a crescer o job pode esgotar o orçamento diário antes de percorrer todos os perfis — a função não tem retry/fila, os utilizadores que ficarem de fora nesse dia simplesmente não recebem push (mesmo comportamento que "sem resultados"). Considerar upgrade de plano Spoonacular quando a base de utilizadores activa ultrapassar ~40-50/dia.
- **Cache SQLite offline (`pantry_items_cache`) não replica `alerta_validade_enviado_em`:** é um campo de controlo interno do servidor (só escrito pela Edge Function `notify-pantry-expiry` ou repostoa `null` pelo caminho online de `usePantry.update`), não é dado que o utilizador precise de ver ou editar offline. Ao ficar opcional no tipo `PantryItem`, nenhuma migração de schema SQLite é necessária.
- **`registerForPush` não é recriado** — `apps/mobile/src/hooks/usePushNotifications.ts` mantém-se inalterado; a única mudança é chamá-lo a partir de um novo sítio (Passo 3 do onboarding).
- **Tipo (4) "novidades de criadores seguidos" não é tocado** — já implementado em `notify-new-video`/`notify_creator_followers`, fora de escopo desta feature (confirmado no ticket).

## Referências
- Research: `thoughts/shared/research/2026-07-30-notificacoes-inteligentes.md`
- Ticket: `thoughts/shared/tickets/2026-07-30-notificacoes-inteligentes.md`
- Padrão de envio de push em lote + trigger `pg_net`: `supabase/functions/notify-new-video/index.ts`, `supabase/schema.sql:253-287`
- Padrão de cache Spoonacular: `supabase/functions/search-recipes/index.ts`
- Padrão de gating Premium via `PLANS[...].features`: `apps/mobile/app/(tabs)/planner.tsx:29`, `packages/config/src/index.ts:21-55`
