---
data: 2026-07-24
feature: "Planos e Pagamentos (F08 — RevenueCat)"
status: completo
---

# Research: Planos e Pagamentos (Upgrade Premium via RevenueCat)

## Questão de Pesquisa
Como configurar produtos/entitlements no RevenueCat para `premium_monthly` e `premium_annual`, qual a estrutura recomendada da Edge Function webhook, se já existe (ou onde deve ficar) um hook partilhado de leitura de plano/entitlements, e qual o setup de sandbox para testar compras iOS/Android — tudo isto no contexto do ticket `thoughts/shared/tickets/2026-07-24-planos-e-pagamentos.md`.

## Sumário
`react-native-purchases` (`^8.0.0`) já está instalado em `apps/mobile`, e o tipo `Plano`, a coluna `profiles.plano`/`revenuecat_id` e os limites (`@emealia/config` `PLANS`/`LIMITS`) já existem e são consumidos por outras features (despensa, favoritos, lista de compras). **Não existe ainda** nenhum `src/lib/revenuecat.ts`, nenhuma Edge Function webhook, nenhum ecrã de upgrade, nenhum componente de "lock" reutilizável, e nenhuma chave de serviço (`SUPABASE_SERVICE_ROLE_KEY`) ou segredo de webhook no `.env`. O hook partilhado de leitura de plano **já existe** — é `useProfile()` + `useProfileStore` (Zustand) — e deve ser reutilizado, não recriado.

## Ficheiros Relevantes da Codebase

- `apps/mobile/package.json` — depende de `"react-native-purchases": "^8.0.0"` (já instalado, ver `apps/mobile/node_modules/@revenuecat`); não há chamadas a esta lib em lado nenhum do código ainda.
- `packages/types/src/user.ts:1,16-29` — define `export type Plano = 'free' | 'premium_monthly' | 'premium_annual'` e a interface `Profile` com `plano: Plano` e `revenuecat_id: string | null`.
- `packages/supabase/src/queries/profile.ts` — `getProfile(client, userId)` e `updateProfile(client, userId, updates)`, ambos simples wrappers sobre `client.from('profiles')`. Padrão a seguir para qualquer nova query de perfil/plano.
- `packages/config/src/index.ts:19-36` — `PLANS` (preço + label por plano) e `LIMITS` (limites free vs premium para `pantry_items`, `saved_recipes`, `daily_feed`). **Não tem** ainda uma lista de features por plano nem "melhor valor" flag — a tabela de comparação do ecrã de upgrade vai precisar de dados adicionais (ver Questões em Aberto).
- `apps/mobile/src/hooks/useProfile.ts` — hook que lê o perfil (incl. `plano`) via `useProfileStore`, com lógica para não re-fazer fetch se o perfil já está em memória (comentário explica que isto evita sobrepor updates optimistas, ex. do onboarding). **Este é o "hook partilhado de leitura de plano" pedido na pesquisa** — já existe, não precisa de ser criado de novo.
- `apps/mobile/src/stores/profileStore.ts` — store Zustand com `profile: Profile | null`, `setProfile`, `setLoading`. Qualquer atualização optimista de `plano` após compra deve passar por `useProfileStore.getState().setProfile(...)`.
- `apps/mobile/src/hooks/useAuth.ts` — subscrição única (singleton) ao `supabase.auth`, escreve para `authStore` partilhada. Expõe `session`, `user`. É daqui que se obtém `user.id` para associar ao RevenueCat (`Purchases.logIn(user.id)`).
- `apps/mobile/app/(tabs)/pantry.tsx:15,20,28,90` e `apps/mobile/app/(tabs)/search.tsx:20,27-28,142` — padrão de bloqueio actual: `const limit = profile?.plano === 'free' ? LIMITS.free.X : LIMITS.premium.X`, com mensagem de texto simples quando o limite é atingido. **Não há** lock icon nem navegação para um ecrã de upgrade — é só texto estático.
- `apps/mobile/src/components/shopping/ShoppingListModal.tsx:33,39-45,92-98` — padrão de bloqueio de uma acção premium (export para Reminders/Tasks): `if (profile?.plano === 'free') { setUpgradeVisible(true); return; }`, mostrando um `<Card>` com mensagem, sem CTA nem navegação real para o upgrade. Este é o ponto de bloqueio mais próximo do que a nova feature terá de substituir/complementar com um CTA real.
- `apps/mobile/app/(tabs)/planner.tsx` — ecrã já rotulado "F09 — Planeamento semanal (Premium)" mas **sem qualquer gating implementado** (qualquer utilizador, free ou premium, consegue gerar a lista da semana). Confirma que o bloqueio de planner/macros ainda está por fazer — não é escopo desta ticket implementar o planner em si (isso é F09, Fase 2), mas o mecanismo de lock genérico criado aqui deverá ser aplicável lá no futuro.
- `apps/mobile/app/(tabs)/profile.tsx` — **stub total**: `<Text>F13 — Perfil e configurações</Text>`. O ecrã completo de perfil é F13 (Fase 2, fora do MVP), mas o ticket actual (F08) pede explicitamente para "confirmar plano activo no perfil do utilizador" — logo esta ticket precisa de adicionar uma secção mínima de plano a este stub, sem construir o F13 completo (upload de foto, GDPR, idioma, etc.).
- `apps/mobile/app/(tabs)/_layout.tsx` — `<Tabs>` com 6 separadores (`index`, `search`, `favoritos`, `pantry`, `planner`, `profile`); não há rota de "upgrade" nem padrão de modal definido aqui.
- `apps/mobile/app/_layout.tsx` — root layout usa `<Stack screenOptions={{ headerShown: false }} />` simples (Expo Router). Uma nova rota `app/upgrade.tsx` (fora do grupo `(tabs)`) ficaria automaticamente disponível como ecrã do Stack e pode ser aberta com `router.push('/upgrade')`; pode usar `presentation: 'modal'` nas opções da rota se se quiser um modal.
- `apps/mobile/src/components/ui/Button.tsx`, `Card.tsx`, `Badge.tsx`, `Pill.tsx` — componentes UI existentes reutilizáveis; não há nenhum componente de "lock"/paywall ainda.
- `apps/mobile/src/constants/theme.ts` — `colors`, `fonts`, `spacing` tokens (mesmos valores que `@emealia/config`, ligeira duplicação já existente no repo entre `src/constants/theme.ts` e `packages/config/src/index.ts` — os ecrãs mobile importam de `@/constants/theme`, não de `@emealia/config`, apesar de os valores serem idênticos).
- `.env.example` — já declara `EXPO_PUBLIC_REVENUECAT_IOS_KEY=appl_xxx` e `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY=goog_xxx`. **Não existe** `SUPABASE_SERVICE_ROLE_KEY` nem nenhum segredo de webhook (`REVENUECAT_WEBHOOK_SECRET` ou equivalente) — terá de ser adicionado.
- `FEATURES.md:154-171` — descrição oficial do F08 (idêntica ao ticket já criado). `FEATURES.md:250-265` (F13) confirma que a secção "plano" completa (data de renovação, gerir subscrição) só é esperada no ecrã de perfil completo da Fase 2 — reforça que nesta ticket basta uma versão mínima.

## Padrões de Implementação Existentes

**Leitura de plano (a reutilizar, não recriar):**
```typescript
// apps/mobile/app/(tabs)/pantry.tsx
import { useProfile } from '@/hooks/useProfile';
import { LIMITS } from '@emealia/config';

const { profile } = useProfile(user?.id);
const limit = profile?.plano === 'free' ? LIMITS.free.pantry_items : LIMITS.premium.pantry_items;
```

**Bloqueio de acção premium (padrão a estender com CTA real de navegação):**
```typescript
// apps/mobile/src/components/shopping/ShoppingListModal.tsx
function handleExport() {
  if (profile?.plano === 'free') {
    setUpgradeVisible(true);
    return;
  }
  exportItems(items.filter((i) => !i.comprado));
}
```

**Query de perfil (padrão para qualquer update de `plano`/`revenuecat_id`):**
```typescript
// packages/supabase/src/queries/profile.ts
export async function updateProfile(
  client: SupabaseClient<Database>,
  userId: string,
  updates: Partial<Profile>
) {
  return client.from('profiles').update(updates).eq('id', userId).select().single();
}
```

**Edge Function (padrão do repo — `supabase/functions/search-recipes/index.ts`):**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// ... env vars via Deno.env.get('X')!
serve(async (req) => {
  const body = await req.json();
  // ... lógica, cache Redis quando aplicável
  return new Response(JSON.stringify({ ... }), { headers: { 'Content-Type': 'application/json' } });
});
```
**Nota importante:** nenhuma das 4 Edge Functions existentes (`search-recipes`, `autocomplete-ingredients`, `youtube-feed`, `recipe-ingredients`) usa `createClient` do `@supabase/supabase-js` nem escreve na base de dados — todas são proxies read-only para APIs externas com cache Redis. A Edge Function webhook do RevenueCat será a **primeira** a precisar de um cliente Supabase com `SUPABASE_SERVICE_ROLE_KEY` (para poder fazer `UPDATE profiles SET plano = ... WHERE id = ...` de qualquer utilizador, já que quem chama o webhook é o RevenueCat, não o utilizador autenticado) — não há precedente directo no repo para copiar, apenas o padrão genérico de `Deno.serve`.

## Tabelas/Queries Supabase Relevantes

`supabase/schema.sql:6-25`:
```sql
CREATE TABLE IF NOT EXISTS profiles (
  id                 uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  nome               text,
  email              text NOT NULL,
  avatar_url         text,
  filtros_dieteticos text[]    DEFAULT '{}',
  plano              text      DEFAULT 'free' CHECK (plano IN ('free','premium_monthly','premium_annual')),
  revenuecat_id      text,
  gdpr_consent       boolean   DEFAULT false,
  gdpr_consent_at    timestamptz,
  frequencia_cozinha int CHECK (frequencia_cozinha BETWEEN 0 AND 7),
  onboarding_completo boolean DEFAULT false,
  created_at         timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: só o próprio" ON profiles;
CREATE POLICY "profiles: só o próprio"
  ON profiles FOR ALL USING (auth.uid() = id);
```
- A coluna `plano` já tem `CHECK` constraint com os 3 valores correctos — não precisa de migration para isso.
- A RLS policy é `FOR ALL USING (auth.uid() = id)` — **isto bloqueia qualquer update feito com a chave anon/authenticated por um pedido que não seja do próprio utilizador**. A Edge Function webhook do RevenueCat (chamada pelo servidor da RevenueCat, sem sessão de utilizador) só consegue fazer `UPDATE profiles` se usar a `service_role` key (que faz bypass a RLS) — confirma a necessidade de `SUPABASE_SERVICE_ROLE_KEY` como novo segredo apenas em Edge Function.
- Não existe nenhuma tabela de log/idempotência de eventos de webhook (ex. `revenuecat_events`) no schema actual, nem pasta de migrations separada — o schema é um único ficheiro idempotente (`CREATE TABLE IF NOT EXISTS`) corrido manualmente no SQL Editor do Supabase Dashboard.
- Não há trigger ou função SQL relacionada com `plano`/`revenuecat_id` além do `handle_new_user()` que cria o perfil com os defaults (`plano` fica `'free'` por omissão).

## APIs Externas Relevantes — RevenueCat

### 1. Estrutura Products / Entitlements / Offerings / Packages
- **Products** = SKUs reais da App Store Connect / Google Play Console (têm de ser criados nessas consolas *antes* de serem ligados à RevenueCat).
- **Entitlements** = nível de acesso/feature que o utilizador desbloqueia. Um único produto pode desbloquear múltiplos entitlements, e **múltiplos produtos podem desbloquear o mesmo entitlement** — este é exactamente o caso do eMealia.
- **Recomendação oficial para este caso** (fonte: RevenueCat docs — Entitlements): criar **um único entitlement** (ex. `"premium"`) e associar-lhe os dois produtos/packages (`premium_monthly` e `premium_annual`). Isto simplifica a lógica da app para uma única verificação (`customerInfo.entitlements.active['premium']`) em vez de verificar dois entitlements separados.
- **Offerings/Packages**: agrupar os dois produtos numa Offering (ex. `"default"`) com dois Packages (`$rc_monthly`, `$rc_annual`) é o padrão recomendado para apresentar as opções no ecrã de upgrade.
- Pré-requisito: criar os produtos de subscrição em App Store Connect (grupo de subscrições + 2 produtos) e Google Play Console (2 produtos de subscrição) antes de os configurar no dashboard RevenueCat.

### 2. SDK `react-native-purchases`
- Instalação: `npm install --save react-native-purchases` (já feito — versão `^8.0.0` no `package.json`). Requer código nativo — **não funciona no Expo Go**, precisa de development build (`eas build --profile development`), o que já está alinhado com o `eas.json` do CLAUDE.md (`developmentClient: true` no profile `development`).
- Inicialização: `Purchases.configure({ apiKey: <chave por plataforma> })`, tipicamente no arranque da app, escolhendo a chave `EXPO_PUBLIC_REVENUECAT_IOS_KEY` ou `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` consoante `Platform.OS`.
- Associação ao utilizador: `Purchases.logIn(appUserId)` associa o RevenueCat ao `user.id` do Supabase Auth (chamar isto depois do login/registo bem-sucedido, coerente com o singleton de `useAuth`/`authStore` já existente no repo). Antes do login, o RevenueCat usa um App User ID anónimo gerado automaticamente.
- Verificação de acesso: `customerInfo.entitlements.active['premium']` — presença/ausência indica se o utilizador tem acesso premium activo; o `CustomerInfo` obtém-se via `Purchases.getCustomerInfo()` ou no callback de `Purchases.configure`/listener.
- Restaurar compras: `Purchases.restorePurchases()` — refaz o `CustomerInfo` a partir das compras associadas à conta da store (Apple/Google) do dispositivo actual.

### 3. Webhooks (RevenueCat → Edge Function)
- **Tipos de evento relevantes**: `INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `UNCANCELLATION`, `EXPIRATION`, `BILLING_ISSUE`, `PRODUCT_CHANGE` (mudança de mensal para anual ou vice-versa), `SUBSCRIPTION_PAUSED`, `SUBSCRIPTION_EXTENDED`, `TRANSFER` (entitlements transferidos entre App User IDs — relevante se um utilizador se autentica em dispositivos diferentes antes/depois do login), `TEST` (evento de teste disparado manualmente no dashboard).
- **Campos-chave do payload**: `api_version`, `type`, `id` (usar para idempotência), `event_timestamp_ms`, `app_id`, `app_user_id`, `original_app_user_id`, `aliases`, `product_id`, `entitlement_ids`, `period_type`, `store`, `environment` (`SANDBOX` vs `PRODUCTION` — importante para não confundir compras de teste com reais), `expiration_at_ms`, `transaction_id`, `cancel_reason`, `expiration_reason`.
- **Autenticação do webhook**: duas opções configuráveis no dashboard RevenueCat — (a) um Authorization header simples partilhado (comparar string), ou (b) assinatura HMAC recomendada: header `X-RevenueCat-Webhook-Signature: t=<timestamp>,v1=<hmac_sha256_hex>`, calculado sobre `"<timestamp>.<corpo_raw_json>"` com o signing secret da integração. **Crítico**: a verificação tem de ser feita sobre os bytes do corpo em bruto, antes de fazer `JSON.parse` — reserializar invalida a assinatura.
- **Idempotência / entrega fora de ordem**: RevenueCat garante "at least once delivery" — o mesmo evento pode chegar duplicado; a doc recomenda guardar o `id` do evento para evitar processar duas vezes. Como não há tabela de log de eventos no schema actual, será preciso decidir uma abordagem simples (ver Questões em Aberto).
- **Determinar estado actual de forma fiável**: a recomendação oficial da RevenueCat é, ao receber qualquer webhook, chamar o endpoint REST `GET /subscribers/{app_user_id}` para obter o `CustomerInfo` completo e autoritativo, em vez de tentar reconstruir o estado a partir dos campos individuais do evento — isto lida correctamente com entrega fora de ordem. Este endpoint precisa de uma **secret API key** da RevenueCat (diferente das chaves públicas `EXPO_PUBLIC_REVENUECAT_*_KEY` usadas no cliente) — mais um segredo a adicionar como variável de ambiente da Edge Function.

### 4. Sandbox / Testes
- RevenueCat recomenda uma estratégia em duas fases: (1) **Test Store** integrado da RevenueCat durante o desenvolvimento — não requer contas nas plataformas, funciona imediatamente; (2) **Sandboxes das plataformas** (Apple/Google) antes do lançamento, para validar a integração end-to-end real. A documentação alerta que os sandboxes das stores frequentemente não devolvem preços/metadados exactos por região — recomenda-se testar apenas o *fluxo* da compra nessa fase, não os valores exibidos.
- iOS: testes via Sandbox Apple ID / StoreKit Testing / TestFlight — requer Apple Developer Account activa (já assinalado como pré-requisito no CLAUDE.md).
- Android: testes via license testers configurados na Google Play Console / faixa de testes interna — requer Google Play Console activa (já assinalado como pré-requisito no CLAUDE.md).
- **Gap não coberto pela documentação oficial consultada**: não encontrei guidance específica da RevenueCat sobre EAS Build (apenas menção genérica a Expo/React Native). Pelo conhecimento geral do ecossistema Expo: como `react-native-purchases` tem módulos nativos, os testes de sandbox exigem sempre um **development build via EAS** (`eas build --profile development --platform ios|android`) instalado no dispositivo — nunca funciona em Expo Go. Isto está alinhado com o `eas.json` já definido no CLAUDE.md do projecto.

## Code Snippets de Referência

**Inicialização típica (a confirmar exactamente no research/plan seguinte, com base na SDK v8):**
```typescript
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

Purchases.configure({
  apiKey: Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!,
});

// Depois de login/registo bem-sucedido no Supabase Auth:
await Purchases.logIn(supabaseUserId);
```

**Verificação de entitlement:**
```typescript
const customerInfo = await Purchases.getCustomerInfo();
const isPremium = customerInfo.entitlements.active['premium'] !== undefined;
```

## Questões em Aberto

1. **Estrutura exacta do entitlement no dashboard RevenueCat**: confirmar em `/plan` se se cria um único entitlement `"premium"` com dois packages (`$rc_monthly`, `$rc_annual`) numa Offering `"default"` — a doc confirma que é a abordagem recomendada, mas a configuração real no dashboard tem de ser feita manualmente pelo utilizador (fora do âmbito do código) antes dos testes funcionarem.
2. **Idempotência do webhook sem tabela de log**: o schema actual não tem tabela para guardar `event.id` já processados. Decidir em `/plan`: (a) criar uma tabela nova (ex. `revenuecat_events(event_id text primary key, processed_at timestamptz)`) para garantir idempotência real, ou (b) confiar apenas em `UPDATE ... WHERE plano IS DISTINCT FROM` sendo naturalmente idempotente por reaplicar o mesmo estado (mais simples, mas não regista histórico). A recomendação da própria RevenueCat de sempre buscar `GET /subscribers/{app_user_id}` e aplicar o estado actual (em vez de interpretar o evento individualmente) torna a opção (b) mais robusta e simples de implementar sem nova tabela.
3. **Novo segredo `SUPABASE_SERVICE_ROLE_KEY`**: confirmar que pode ser adicionado ao `.env`/Supabase secrets da Edge Function (`supabase secrets set`) — ainda não existe no repo. Da mesma forma, o secret HMAC do webhook (`REVENUECAT_WEBHOOK_SECRET` ou nome semelhante) e a secret API key da RevenueCat (para o fallback `GET /subscribers`) têm de ser adicionados.
4. **Onde fica o ecrã de upgrade na navegação**: `app/(tabs)/_layout.tsx` não tem rota de upgrade nem padrão de modal estabelecido. Decidir em `/plan` se `app/upgrade.tsx` (fora do grupo `(tabs)`, aberto via `router.push`) é o padrão certo, ou se deve ficar dentro de `app/(tabs)/profile.tsx` como secção/modal.
5. **Preenchimento mínimo de `profile.tsx`**: o ecrã está totalmente por fazer (só tem um `<Text>` placeholder) e o F13 completo é Fase 2. Definir em `/plan` o escopo mínimo desta ticket ali — provavelmente só uma secção “Plano actual” + botão de upgrade/gerir subscrição, sem tocar no resto do F13 (foto, GDPR, idioma).
6. **Lista de features por plano para a tabela de comparação**: `@emealia/config` `PLANS` só tem `price`/`label`, sem lista de features. Decidir se se estende `PLANS`/`LIMITS` em `@emealia/config` com uma lista de features booleanas por plano (planeamento semanal, macros, export Reminders, despensa ilimitada, favoritos ilimitados) para gerar a tabela de comparação e os pontos de bloqueio de forma consistente, em vez de hardcoded no ecrã.
7. **Componente de "lock" reutilizável**: não existe nenhum hoje — os 2 pontos de bloqueio actuais (`pantry.tsx`, `search.tsx`, `ShoppingListModal.tsx`) usam apenas texto/Card estático sem ícone nem CTA de navegação real. Confirmar em `/plan` a criação de um componente único (ex. `src/components/paywall/PremiumLock.tsx`) que os pontos de bloqueio existentes possam adoptar, e se faz sentido nesta ticket já actualizar esses 3 ficheiros para o novo padrão ou deixar como está e só aplicar o novo padrão nos pontos definidos no ticket.
8. **`TRANSFER` events e múltiplos dispositivos/contas**: o evento `TRANSFER` (entitlements movidos entre App User IDs) não foi mencionado no ticket original — decidir em `/plan` se a Edge Function precisa de tratamento explícito para este caso (ex. utilizador compra antes de fazer login, depois associa a conta) ou se basta o comportamento por omissão de sempre reconsultar `GET /subscribers/{app_user_id}` do `app_user_id` presente no evento.
9. **Versão exacta da SDK e API `logIn` vs `configure({ appUserID })`**: a doc oficial consultada não detalhou por completo a assinatura de `Purchases.logIn` para a versão 8.x instalada — confirmar a assinatura exacta e o tratamento de erros (ex. `LogInResult` com `created: boolean`) directamente no `d.ts` do pacote já instalado em `apps/mobile/node_modules/react-native-purchases` durante a fase `/plan`.
