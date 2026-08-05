# F08 — Planos e pagamentos (RevenueCat)

Fonte: `thoughts/shared/plans/2026-07-24-planos-e-pagamentos.md`

## Pré-requisitos
- [x] ⚠️ **Requer dev client** (`eas build --profile development`) — `react-native-purchases` não funciona em Expo Go
- [x] Dashboard RevenueCat configurado: entitlement `premium`, offering `default`, packages `$rc_monthly`/`$rc_annual`, produtos `premium_monthly`/`premium_annual` em App Store Connect / Google Play Console (ou Test Store da RevenueCat para sandbox mais simples)
- [x] Webhook RevenueCat apontado para a Edge Function `revenuecat-webhook`, com `REVENUECAT_WEBHOOK_SECRET` colado no dashboard e definido como secret no Supabase
- [x] Secrets `SUPABASE_SERVICE_ROLE_KEY`, `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_SECRET_API_KEY` configurados

## Testes automáticos / de código
- [x] `npm run typecheck` sem erros
- [x] `expo lint` sem warnings novos
- [x] `deno check supabase/functions/revenuecat-webhook/index.ts` sem erros de tipo

## Testes manuais — inicialização
- [x] Build de development instalado no simulador/dispositivo → app não crasha no arranque (confirma `Purchases.configure` não falha com as chaves configuradas)
- [x] Login com um utilizador → nenhum erro no console relacionado com `Purchases.logIn`

## Testes manuais — componentes de paywall (isolado)
- [x] `PaywallModal` mostra os 3 planos, com "Melhor valor" visível apenas no Anual
- [x] Cores/fontes só usam tokens de `@/constants/theme` (nenhuma cor hardcoded)

## Testes manuais — fluxo de compra/restauro (ecrã Perfil)
- [ ] Utilizador `free`: separador Perfil mostra "Grátis" + botão "Fazer upgrade"
- [ ] Tocar "Fazer upgrade" → abre `PaywallModal`
- [ ] ⚠️ Sandbox — comprar Premium Mensal → ecrã de Perfil actualiza para "Premium Mensal" após fechar o modal
- [ ] Utilizador Premium: "Gerir subscrição" → abre o ecrã nativo de gestão de subscrições (App Store/Google Play)
- [ ] "Restaurar compras" sem compra activa → não crasha, mantém `free`
- [ ] Navegar para `/(tabs)/profile?abrirUpgrade=1` (a partir de um `PremiumLock` noutro ecrã) → abre o modal automaticamente

## Testes manuais — retrofit dos pontos de bloqueio (F05/F06/F07)
- [ ] Utilizador `free` com despensa cheia (20 itens, F05) → vê `PremiumLock` (não o `Card` antigo); "Fazer upgrade" navega para Perfil com modal já aberto
- [ ] Mesmo comportamento em `search.tsx` (limite de favoritos, F06) e `ShoppingListModal` (export bloqueado, F07)

## Testes manuais — webhook (servidor)
- [ ] Disparar evento `TEST` a partir do dashboard RevenueCat → `200 OK`, nenhuma alteração em `profiles` (utilizador de teste não existe)
- [ ] Compra sandbox real associada a um `app_user_id` existente em `profiles` → `plano`/`revenuecat_id` actualizados após `INITIAL_PURCHASE`
- [ ] Reenviar manualmente o mesmo evento (RevenueCat dashboard tem opção de reenvio) → resultado em `profiles` não muda (idempotência)
- [ ] Chamar a função sem o header `Authorization` correcto → `401`

## Verificação de dados (Supabase)
```sql
select plano, revenuecat_id from profiles where id = '<id de teste>';
```

## Regressão a vigiar
- Este teste deve ser repetido sempre que uma nova feature Premium (F09, F10, F14) adicionar uma nova flag a `PLANS[...].features` — confirmar que o `PaywallModal`/`PlanComparisonTable` continuam correctos.
- `useAuth.ts` ganha `identifyPurchasesUser` nesta feature — retestar login/logout (F01) depois desta alteração.
