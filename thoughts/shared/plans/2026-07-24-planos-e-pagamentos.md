---
data: 2026-07-24
feature: "Planos e Pagamentos (F08 — RevenueCat)"
research: "thoughts/shared/research/2026-07-24-planos-e-pagamentos.md"
status: completo
---

# Spec: Planos e Pagamentos (Upgrade Premium via RevenueCat)

## Visão Geral
Implementa o mecanismo de monetização do eMealia: inicialização do SDK RevenueCat, secção de plano/upgrade dentro do ecrã de perfil, componente de bloqueio "premium lock" reutilizável (aplicado retroactivamente aos 3 pontos de bloqueio existentes), e a Edge Function webhook que mantém `profiles.plano` sincronizado com o estado real da subscrição.

## Decisões de arquitectura (confirmadas com o utilizador)
1. **Localização do ecrã de upgrade**: secção/modal dentro de `app/(tabs)/profile.tsx` — não é criada uma rota `app/upgrade.tsx`. CTAs contextuais noutros ecrãs navegam para `/(tabs)/profile` com o parâmetro `abrirUpgrade=1`, que a `profile.tsx` lê para abrir o modal automaticamente.
2. **Retrofit do lock**: `pantry.tsx`, `search.tsx` e `ShoppingListModal.tsx` são migrados nesta ticket para usar o novo componente `PremiumLock`, substituindo os `<Card>` de texto estático actuais.
3. **Idempotência do webhook**: sem tabela nova. Cada evento recebido dispara sempre `GET /subscribers/{app_user_id}` à RevenueCat e aplica o estado autoritativo devolvido a `profiles.plano` — naturalmente idempotente.
4. **Features por plano**: centralizadas em `@emealia/config` (`PLANS[plano].features`), consumidas pela tabela de comparação e por qualquer ponto de bloqueio futuro.
5. **Identificadores de produto**: os Product IDs criados em App Store Connect / Google Play Console / RevenueCat dashboard devem ser literalmente `premium_monthly` e `premium_annual` (iguais aos valores do tipo `Plano`), associados a um único entitlement `premium` numa Offering `default` com packages `$rc_monthly` / `$rc_annual`. Isto permite mapear `productIdentifier → Plano` sem tabela de tradução.
6. **Assinatura do webhook (revisto na implementação)**: a decisão original previa verificação HMAC (`X-RevenueCat-Webhook-Signature: t=<ts>,v1=<hmac>`), assumindo que era a opção recomendada pela RevenueCat. Confirmado durante a Fase 5 que o dashboard da RevenueCat **não oferece esse mecanismo** — apenas um campo "Authorization header value" definido pelo próprio utilizador. A função valida por comparação em tempo constante do header `Authorization` recebido contra `REVENUECAT_WEBHOOK_SECRET` (valor à escolha do utilizador, colado também no dashboard RevenueCat). Ver `supabase/functions/revenuecat-webhook/index.ts`.

## Ficheiros a Criar

### `apps/mobile/src/lib/revenuecat.ts`
**Propósito:** Único ponto de configuração e acesso ao SDK `react-native-purchases`.
**Conteúdo:**
```typescript
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering } from 'react-native-purchases';
import { Platform } from 'react-native';
import type { Plano } from '@emealia/types';

export const PREMIUM_ENTITLEMENT_ID = 'premium';

let configured = false;

export function configurePurchases(): void {
  if (configured) return;
  configured = true;
  const apiKey = Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY
    : process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (!apiKey) {
    console.warn('[eMealia] RevenueCat não configurado — falta EXPO_PUBLIC_REVENUECAT_IOS_KEY/ANDROID_KEY.');
    return;
  }
  Purchases.configure({ apiKey });
  if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
}

export async function identifyPurchasesUser(userId: string): Promise<void> {
  if (!configured) return;
  await Purchases.logIn(userId);
}

export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  const offerings = await Purchases.getOfferings();
  return offerings.current;
}

export function planoFromCustomerInfo(customerInfo: CustomerInfo): Plano {
  const entitlement = customerInfo.entitlements.active[PREMIUM_ENTITLEMENT_ID];
  if (!entitlement) return 'free';
  return entitlement.productIdentifier === 'premium_annual' ? 'premium_annual' : 'premium_monthly';
}
```
- Não expor `Purchases.purchasePackage`/`restorePurchases` aqui — ficam encapsulados no hook `useRevenueCat` (mais fácil de mockar em testes e de manter o estado de loading junto da chamada).

### `apps/mobile/src/hooks/useRevenueCat.ts`
**Propósito:** Hook que expõe offerings, compra, restauro, e sincronização optimista de `profiles.plano`/`revenuecat_id` após qualquer transação bem-sucedida.
**Conteúdo:**
```typescript
import { useEffect, useState } from 'react';
import Purchases from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { getCurrentOffering, planoFromCustomerInfo } from '@/lib/revenuecat';
import { updateProfile } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import { useProfileStore } from '@/stores/profileStore';

export function useRevenueCat(userId: string | undefined) {
  const [offering, setOffering]   = useState<PurchasesOffering | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring]   = useState(false);

  useEffect(() => {
    getCurrentOffering().then(setOffering).catch(() => setOffering(null));
  }, []);

  async function sincronizarPlano(customerInfo: CustomerInfo) {
    if (!userId) return;
    const plano = planoFromCustomerInfo(customerInfo);
    const revenuecatId = await Purchases.getAppUserID();
    const profileAtual = useProfileStore.getState().profile;
    if (profileAtual) {
      useProfileStore.getState().setProfile({ ...profileAtual, plano, revenuecat_id: revenuecatId });
    }
    await updateProfile(supabase!, userId, { plano, revenuecat_id: revenuecatId });
  }

  async function comprar(pacote: PurchasesPackage): Promise<{ ok: true } | { ok: false; cancelado: boolean }> {
    setPurchasing(true);
    try {
      const { customerInfo } = await Purchases.purchasePackage(pacote);
      await sincronizarPlano(customerInfo);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, cancelado: !!e?.userCancelled };
    } finally {
      setPurchasing(false);
    }
  }

  async function restaurar(): Promise<boolean> {
    setRestoring(true);
    try {
      const customerInfo = await Purchases.restorePurchases();
      await sincronizarPlano(customerInfo);
      return true;
    } catch {
      return false;
    } finally {
      setRestoring(false);
    }
  }

  return { offering, purchasing, restoring, comprar, restaurar };
}
```
- `comprar`/`restaurar` devolvem valores simples (não lançam) para os ecrãs decidirem a UI de erro sem `try/catch` duplicado.

### `apps/mobile/src/components/paywall/PremiumLock.tsx`
**Propósito:** Componente único de bloqueio reutilizável (ícone + mensagem contextual + CTA), substitui os `<Card>` de texto estático.
**Conteúdo:**
```typescript
import { View, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { colors, fonts, spacing } from '@/constants/theme';

interface PremiumLockProps {
  mensagem: string;
}

export function PremiumLock({ mensagem }: PremiumLockProps) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.sm }}>
        <Ionicons name="lock-closed" size={20} color={colors.primary} />
        <Text style={{ flex: 1, fontFamily: fonts.medium, fontSize: 14, color: colors.textInverted }}>
          {mensagem}
        </Text>
      </View>
      <Button
        label="Fazer upgrade"
        onPress={() => router.push({ pathname: '/(tabs)/profile', params: { abrirUpgrade: '1' } })}
      />
    </Card>
  );
}
```
- Menos de 150 linhas, sem lógica de negócio — só navegação + apresentação.

### `apps/mobile/src/components/paywall/PlanComparisonTable.tsx`
**Propósito:** Tabela de comparação dos 3 planos, lida de `@emealia/config` `PLANS`, com destaque "Melhor valor" no Anual.
**Conteúdo:**
- Recebe nenhuma prop (lê `PLANS` directamente) ou opcionalmente `planoAtual?: Plano` para destacar a linha do plano actual.
- Renderiza 3 colunas/cartões (Grátis / Mensal / Anual), com `Badge` "Melhor valor" (variant `alerta`) sobre a coluna `premium_annual` (`PLANS.premium_annual.melhorValor === true`).
- Lista de features por plano vindas de `PLANS[plano].features`, com um ícone `checkmark-circle`/`close-circle` (Ionicons) por feature, usando os labels: "Planeamento semanal", "Contagem de macros", "Export para Lembretes/Tasks", "Despensa ilimitada", "Favoritos ilimitados".
- Sob 150 linhas — se ultrapassar, extrair uma sub-linha `PlanFeatureRow` no mesmo ficheiro (componente interno, não exportado).

### `apps/mobile/src/components/paywall/PaywallModal.tsx`
**Propósito:** Modal de upgrade (aberto a partir de `profile.tsx`) com `PlanComparisonTable` + botões de compra dos 2 planos pagos + restaurar compras.
**Conteúdo:**
```typescript
interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | undefined;
}
```
- Usa `useRevenueCat(userId)` para obter `offering.availablePackages`, `purchasing`, `comprar`.
- Mapeia os packages disponíveis (`$rc_monthly` → Mensal, `$rc_annual` → Anual) a botões com preço vindo de `PLANS` (não do `PurchasesPackage.product.priceString` para manter consistência de copy em pt-PT — usar o preço da store apenas como fallback se `offering` ainda não carregou).
- Ao `comprar(pacote)` devolver `{ ok: true }`: `Alert.alert('Subscrição activada', ...)` e `onClose()`.
- Ao devolver `{ ok: false, cancelado: false }`: `Alert.alert('Não foi possível completar a compra', ...)`. Se `cancelado: true`, não mostra alerta (utilizador cancelou intencionalmente).
- Botão "Restaurar compras" chama `restaurar()` do hook; sucesso mostra `Alert` de confirmação e fecha o modal se o plano deixou de ser `free`.
- Sob 150 linhas — se necessário, extrair o botão de package individual para `PlanPurchaseButton.tsx` no mesmo directório.

## Ficheiros a Modificar

### `packages/config/src/index.ts`
**Modificações:**
- [ ] Estender `PLANS` com `melhorValor: boolean` e `features` por plano:
```typescript
export const PLANS = {
  free: {
    price: 0, label: 'Grátis', melhorValor: false,
    features: {
      planeamento_semanal: false,
      macros: false,
      export_lembretes: false,
      despensa_ilimitada: false,
      favoritos_ilimitados: false,
    },
  },
  premium_monthly: {
    price: 4.99, label: 'Premium Mensal', melhorValor: false,
    features: {
      planeamento_semanal: true,
      macros: true,
      export_lembretes: true,
      despensa_ilimitada: true,
      favoritos_ilimitados: true,
    },
  },
  premium_annual: {
    price: 34.99, label: 'Premium Anual', melhorValor: true,
    features: {
      planeamento_semanal: true,
      macros: true,
      export_lembretes: true,
      despensa_ilimitada: true,
      favoritos_ilimitados: true,
    },
  },
} as const;
```
- Não remover `price`/`label` existentes — só adicionar campos (usos actuais em `pantry.tsx`/`search.tsx` continuam válidos).

### `apps/mobile/app/_layout.tsx`
**Modificações:**
- [ ] Importar `configurePurchases` de `@/lib/revenuecat`.
- [ ] Chamar `configurePurchases()` dentro de um `useEffect(() => { configurePurchases(); }, [])` novo, antes do `useAuth()`/`useProfile()` (não precisa de esperar `authReady` — é síncrono e idempotente).

### `apps/mobile/src/hooks/useAuth.ts`
**Modificações:**
- [ ] Importar `identifyPurchasesUser` de `@/lib/revenuecat`.
- [ ] Dentro de `ensureAuthListener()`, no callback de `supabase.auth.onAuthStateChange((_event, session) => {...})`, depois de `setSession(session)`, adicionar: `if (session?.user) identifyPurchasesUser(session.user.id);` — associa o RevenueCat ao utilizador em qualquer transição de sessão (login, restauro de sessão), não só no primeiro login.
- [ ] Fazer o mesmo no `.then(({ data: { session } }) => {...})` inicial (`getSession()`), para o caso de sessão já existente ao abrir a app.

### `apps/mobile/app/(tabs)/profile.tsx`
**Modificações — reescrever o ficheiro por completo** (está vazio/stub):
- [ ] Ler `useAuth()` para `user`, `useProfile(user?.id)` para `profile`, `useRevenueCat(user?.id)` para `restaurar`/`restoring`.
- [ ] Ler `useLocalSearchParams<{ abrirUpgrade?: string }>()`; `useEffect` que abre o `PaywallModal` (`setPaywallVisible(true)`) quando `abrirUpgrade === '1'`.
- [ ] Buscar `CustomerInfo` uma vez ao montar (via `Purchases.getCustomerInfo()`) para obter a data de renovação: `customerInfo.entitlements.active['premium']?.expirationDate` (formatar em pt-PT, `Intl.DateTimeFormat('pt-PT', ...)`).
- [ ] Secção "Plano actual": mostra `PLANS[profile.plano].label`, e se `profile.plano !== 'free'`, a data de renovação (se disponível) e um botão "Gerir subscrição" que chama `Purchases.showManageSubscriptions()` (abre a gestão nativa da store — cobre o critério de "cancelar subscrição").
- [ ] Se `profile.plano === 'free'`: botão "Fazer upgrade" que abre o `PaywallModal`.
- [ ] Botão "Restaurar compras" sempre visível, chama `restaurar()`; `loading={restoring}`.
- [ ] Renderiza `<PaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} userId={user?.id} />` fora do scroll principal.
- [ ] Ficheiro sob 150 linhas — se ultrapassar, extrair a secção "Plano actual" para `src/components/profile/PlanoAtualCard.tsx`.

### `apps/mobile/app/(tabs)/pantry.tsx`
**Modificações:**
- [ ] Importar `PremiumLock` de `@/components/paywall/PremiumLock`.
- [ ] Substituir o bloco (linhas 86-94, `{limitReached && <View>...<Card>...</Card></View>}`) por:
```tsx
{limitReached && (
  <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
    <PremiumLock mensagem={`Atingiste o limite de ${limit} itens do plano Grátis. Faz upgrade para Premium para adicionares mais.`} />
  </View>
)}
```
- [ ] Remover o import de `Card` se deixar de ser usado neste ficheiro (verificar outros usos antes de remover).

### `apps/mobile/app/(tabs)/search.tsx`
**Modificações:**
- [ ] Importar `PremiumLock`.
- [ ] Substituir o bloco (linhas 138-146, `{limitReached && <View>...<Card>...</Card></View>}`) por:
```tsx
{limitReached && (
  <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
    <PremiumLock mensagem={`Atingiste o limite de ${limit} receitas guardadas do plano Grátis. Faz upgrade para Premium para guardares mais.`} />
  </View>
)}
```
- [ ] Remover import de `Card` se deixar de ser usado.

### `apps/mobile/src/components/shopping/ShoppingListModal.tsx`
**Modificações:**
- [ ] Importar `PremiumLock`.
- [ ] Substituir o bloco (linhas 92-98, `{upgradeVisible && profile?.plano === 'free' && <Card>...</Card>}`) por:
```tsx
{upgradeVisible && profile?.plano === 'free' && (
  <PremiumLock mensagem="A exportação para Lembretes/Tasks é exclusiva do plano Premium. Faz upgrade para exportares a tua lista." />
)}
```
- [ ] Remover import de `Card` se deixar de ser usado neste ficheiro.

## Ficheiros a Criar — Backend (Supabase)

### `supabase/functions/revenuecat-webhook/index.ts`
**Propósito:** Edge Function que recebe eventos RevenueCat, valida o header `Authorization`, consulta o estado autoritativo via `GET /subscribers/{app_user_id}`, e actualiza `profiles.plano`/`revenuecat_id` com `service_role` (bypass RLS).

**Conteúdo real (revisto na Fase 5 — ver decisão nº 6):**
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL              = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const REVENUECAT_WEBHOOK_SECRET = Deno.env.get('REVENUECAT_WEBHOOK_SECRET')!;
const REVENUECAT_SECRET_API_KEY = Deno.env.get('REVENUECAT_SECRET_API_KEY')!;

const PREMIUM_ENTITLEMENT_ID = 'premium';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// RevenueCat não oferece assinatura HMAC — apenas um "Authorization header
// value" definido pelo utilizador no dashboard (Webhooks > Authorization
// header value), reenviado tal-e-qual no header Authorization de cada
// request. Comparação em tempo constante para evitar timing attacks.
function autorizacaoValida(header: string | null): boolean {
  if (!header || header.length !== REVENUECAT_WEBHOOK_SECRET.length) return false;
  let diff = 0;
  for (let i = 0; i < header.length; i++) {
    diff |= header.charCodeAt(i) ^ REVENUECAT_WEBHOOK_SECRET.charCodeAt(i);
  }
  return diff === 0;
}

function planoFromEntitlements(entitlements: Record<string, { product_identifier: string }>): 'free' | 'premium_monthly' | 'premium_annual' {
  const premium = entitlements[PREMIUM_ENTITLEMENT_ID];
  if (!premium) return 'free';
  return premium.product_identifier === 'premium_annual' ? 'premium_annual' : 'premium_monthly';
}

serve(async (req) => {
  if (!autorizacaoValida(req.headers.get('Authorization'))) {
    return new Response(JSON.stringify({ error: 'não autorizado' }), { status: 401 });
  }

  const { event } = await req.json();
  const appUserId = event.app_user_id as string;

  const subscriberRes = await fetch(`https://api.revenuecat.com/v1/subscribers/${appUserId}`, {
    headers: { Authorization: `Bearer ${REVENUECAT_SECRET_API_KEY}` },
  });
  if (!subscriberRes.ok) {
    return new Response(JSON.stringify({ error: 'falha ao consultar subscriber na RevenueCat' }), { status: 502 });
  }
  const subscriberData = await subscriberRes.json();
  const entitlements = subscriberData.subscriber?.entitlements ?? {};
  const plano = planoFromEntitlements(entitlements);

  await supabaseAdmin
    .from('profiles')
    .update({ plano, revenuecat_id: appUserId })
    .eq('id', appUserId);

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```
- `REVENUECAT_WEBHOOK_SECRET` é um valor à escolha do utilizador (não gerado pela RevenueCat) — o mesmo valor tem de ser colado em "Authorization header value" na configuração do webhook no dashboard RevenueCat.
- Se `appUserId` for um ID anónimo do RevenueCat (ex: `$RCAnonymousID:...`, gerado antes de um `logIn`), o `.update(...).eq('id', appUserId)` simplesmente não encontra nenhuma linha em `profiles` e não faz nada — comportamento seguro por omissão, sem tratamento explícito do evento `TRANSFER`.

## Ficheiros a Modificar — Configuração

### `.env.example`
**Modificações:**
- [ ] Na secção "Servidor — NUNCA no cliente", adicionar:
```bash
# ─── Supabase Service Role (só em Edge Functions — nunca no cliente)
# SUPABASE_SERVICE_ROLE_KEY=eyJxxx...

# ─── RevenueCat (servidor — webhook)
# REVENUECAT_WEBHOOK_SECRET=whsec_xxx
# REVENUECAT_SECRET_API_KEY=sk_xxx
```

## Fases de Implementação

### Fase 1: SDK RevenueCat + hook + inicialização — desbloqueia todo o resto
**Ficheiros:**
- Criar `apps/mobile/src/lib/revenuecat.ts`
- Criar `apps/mobile/src/hooks/useRevenueCat.ts`
- Modificar `apps/mobile/app/_layout.tsx`
- Modificar `apps/mobile/src/hooks/useAuth.ts`
- Modificar `packages/config/src/index.ts` (`PLANS` com `features`/`melhorValor`)

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` (raiz) passa sem erros
- [ ] `expo lint` (`apps/mobile`) sem warnings novos

**Critérios de sucesso (manuais):**
- [ ] Build de development (`eas build --profile development`) instalado no simulador/dispositivo — abrir a app não crasha no arranque (confirma que `Purchases.configure` não falha silenciosamente com chaves de sandbox/Test Store)
- [ ] Login com um utilizador — nenhum erro no console relacionado com `Purchases.logIn`

### Fase 2: Componentes de paywall (PremiumLock, tabela, modal) — UI isolada, sem dependência de ecrãs existentes
**Ficheiros:**
- Criar `apps/mobile/src/components/paywall/PremiumLock.tsx`
- Criar `apps/mobile/src/components/paywall/PlanComparisonTable.tsx`
- Criar `apps/mobile/src/components/paywall/PaywallModal.tsx`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` passa sem erros
- [ ] Todos os 3 ficheiros sob 150 linhas

**Critérios de sucesso (manuais):**
- [ ] Renderizar `PaywallModal` isoladamente (ex: abrir via um botão temporário) mostra os 3 planos, com "Melhor valor" visível apenas no Anual
- [ ] Cores e fontes só usam tokens de `@/constants/theme` (nenhuma cor hardcoded)

### Fase 3: Integração no ecrã de perfil — completa o fluxo de compra/restauro/gestão
**Ficheiros:**
- Reescrever `apps/mobile/app/(tabs)/profile.tsx`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` passa sem erros

**Critérios de sucesso (manuais — requer Test Store RevenueCat ou sandbox):**
- [ ] Abrir separador Perfil com utilizador `free` mostra "Grátis" e botão "Fazer upgrade"
- [ ] Tocar "Fazer upgrade" abre o `PaywallModal`; comprar Premium Mensal (sandbox) actualiza o ecrã para mostrar "Premium Mensal" após fechar o modal
- [ ] Com utilizador Premium, "Gerir subscrição" abre o ecrã nativo de gestão de subscrições (App Store/Google Play)
- [ ] "Restaurar compras" funciona sem uma compra activa (não deve crashar, deve manter `free`)
- [ ] Navegar para `/(tabs)/profile?abrirUpgrade=1` (a partir de um `PremiumLock`) abre o modal automaticamente

### Fase 4: Retrofit dos pontos de bloqueio existentes
**Ficheiros:**
- Modificar `apps/mobile/app/(tabs)/pantry.tsx`
- Modificar `apps/mobile/app/(tabs)/search.tsx`
- Modificar `apps/mobile/src/components/shopping/ShoppingListModal.tsx`

**Critérios de sucesso (automáticos):**
- [ ] `npm run typecheck` passa sem erros

**Critérios de sucesso (manuais):**
- [ ] Utilizador `free` com despensa cheia (20 itens) vê o `PremiumLock` em vez do `Card` antigo; tocar "Fazer upgrade" navega para o Perfil com o modal já aberto
- [ ] Mesmo comportamento em `search.tsx` (limite de favoritos) e `ShoppingListModal` (export bloqueado)

### Fase 5: Edge Function webhook — sincronização servidor
**Ficheiros:**
- Criar `supabase/functions/revenuecat-webhook/index.ts`
- Modificar `.env.example`

**Critérios de sucesso (automáticos):**
- [ ] `deno check supabase/functions/revenuecat-webhook/index.ts` (ou equivalente `supabase functions deploy --dry-run` se disponível) sem erros de tipo

**Critérios de sucesso (manuais):**
- [ ] `supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... REVENUECAT_WEBHOOK_SECRET=... REVENUECAT_SECRET_API_KEY=...`
- [ ] `supabase functions deploy revenuecat-webhook`
- [ ] Disparar um evento `TEST` a partir do dashboard RevenueCat (apontado para o URL da function) — confirmar `200 OK` e nenhuma alteração em `profiles` (utilizador de teste não existe)
- [ ] Fazer uma compra sandbox real associada a um `app_user_id` que corresponda a um utilizador existente em `profiles` — confirmar que `plano`/`revenuecat_id` são actualizados na tabela após o evento `INITIAL_PURCHASE`
- [ ] Reenviar manualmente o mesmo evento (dashboard RevenueCat tem opção de reenvio) — confirmar que o resultado em `profiles` não muda (idempotência)

## Estratégia de Testes
- **Unit:** não há suite de testes automatizados no repo para hooks/componentes (confirmar se se mantém assim); se for necessário, `useRevenueCat` é a unidade mais isolada para testar (mockando `react-native-purchases`).
- **Manual:** ver critérios de sucesso manuais de cada fase. As Fases 3 e 5 dependem de infraestrutura externa (Test Store RevenueCat ou sandbox real da store) — não são verificáveis só com `tsc`/`lint`.

## Notas de Implementação
- **Bloqueio conhecido**: testes de compra reais (Fases 3 e 5, critérios manuais) requerem a configuração manual do dashboard RevenueCat (entitlement `premium`, offering `default`, packages `$rc_monthly`/`$rc_annual`, produtos `premium_monthly`/`premium_annual` em App Store Connect e Google Play Console) — trabalho fora do código, a fazer pelo utilizador antes de correr os critérios manuais. Sem isso, `getOfferings()` devolve `current: null` e o `PaywallModal` deve tratar esse caso (mostrar estado vazio, não crashar).
- **`react-native-purchases` não funciona em Expo Go** — todos os testes manuais desta spec exigem um development build (`eas build --profile development --platform ios|android`), já alinhado com `eas.json`.
- **Nunca commitar** os valores reais de `SUPABASE_SERVICE_ROLE_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_SECRET_API_KEY` — só placeholders em `.env.example`; valores reais via `supabase secrets set`.
- **`Purchases.showManageSubscriptions()`** cobre o critério "cancelar subscrição direcciona para a store" sem qualquer lógica adicional — não implementar cancelamento in-app.
- A tabela `profiles` já tem `CHECK (plano IN ('free','premium_monthly','premium_annual'))` — não é preciso alterar `supabase/schema.sql` nesta ticket.
- Fora do escopo (confirmado no ticket original): faturas/reembolsos, cancelamento in-app, planos B2B/trials/códigos promocionais, ecrã de upgrade na app web, analytics de funnel.

## Referências
- Research: `thoughts/shared/research/2026-07-24-planos-e-pagamentos.md`
- Ticket original: `thoughts/shared/tickets/2026-07-24-planos-e-pagamentos.md`
- Padrão de bloqueio a substituir: `apps/mobile/src/components/shopping/ShoppingListModal.tsx:92-98`
- Padrão de Edge Function existente (proxy read-only, sem `service_role`): `supabase/functions/search-recipes/index.ts`
- Hook de leitura de plano a reutilizar (não recriar): `apps/mobile/src/hooks/useProfile.ts`
- API SDK confirmada em `apps/mobile/node_modules/react-native-purchases/dist/purchases.d.ts` (`configure`, `logIn`, `restorePurchases`, `getCustomerInfo`, `showManageSubscriptions`, `getAppUserID`)
