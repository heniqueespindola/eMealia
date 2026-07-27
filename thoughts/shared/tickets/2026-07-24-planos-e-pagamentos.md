---
data: 2026-07-24
status: backlog
prioridade: alta
fase_mvp: sim
---

# Feature: Planos e Pagamentos (Upgrade Premium)

## Contexto
F08 do MVP e o mecanismo de monetização da app: sem ele, o eMealia não gera receita. As restantes features do MVP (planeamento semanal, macros, export Reminders, despensa e favoritos ilimitados) já assumem a existência de um `plano` no perfil do utilizador para decidir o que bloquear — esta ticket entrega o ecrã que apresenta essa proposta de valor, o mecanismo de compra via RevenueCat, e a sincronização do `plano` em `profiles` que todas as outras features leem. Posicionamento: alternativa europeia mais acessível ao Samsung Food+ ($6,99/mês), com Premium Mensal a €4,99 e Premium Anual a €34,99 (~€2,92/mês) como "melhor valor".

## Comportamento esperado

**Ver ecrã de comparação de planos**
**Dado que** o utilizador abre o ecrã de upgrade (a partir do perfil ou de um CTA contextual)
**Quando** o ecrã carrega
**Então** vê os 3 planos (Grátis, Premium Mensal €4,99/mês, Premium Anual €34,99/ano) numa tabela de comparação de features, com o Premium Anual destacado visualmente como "Melhor valor"

**Subscrever Premium Mensal ou Anual**
**Dado que** o utilizador está no ecrã de upgrade
**Quando** escolhe um dos planos pagos e confirma a compra
**Então** o fluxo nativo de compra é iniciado via RevenueCat (StoreKit 2 no iOS / Google Play Billing no Android) e, em caso de sucesso, o utilizador vê confirmação imediata na app

**Bloquear feature premium com CTA contextual**
**Dado que** um utilizador no plano `free` tenta aceder a uma funcionalidade Premium (planeamento semanal, macros, export Reminders, despensa acima do limite, favoritos acima do limite)
**Quando** interage com essa funcionalidade
**Então** vê um lock icon e uma mensagem contextual a explicar que é Premium, com CTA que leva directamente ao ecrã de upgrade

**Restaurar compras anteriores**
**Dado que** o utilizador reinstalou a app ou trocou de dispositivo e já tinha uma subscrição activa
**Quando** escolhe "restaurar compras" no ecrã de upgrade ou perfil
**Então** o RevenueCat verifica as compras associadas à conta da store (Apple/Google) e, se existir subscrição activa, o `plano` do utilizador é actualizado e reflectido na app

**Ver plano activo no perfil**
**Dado que** o utilizador está no ecrã de perfil
**Quando** o ecrã carrega
**Então** vê o plano actual (Grátis / Premium Mensal / Premium Anual), e se for Premium, a data de renovação (quando disponível via RevenueCat)

**Actualizar `profiles.plano` via webhook RevenueCat**
**Dado que** uma compra, renovação, cancelamento ou expiração de subscrição ocorre numa store
**Quando** o RevenueCat envia o evento para a Edge Function webhook do Supabase
**Então** a coluna `plano` em `profiles` é actualizada de forma consistente com o estado reportado pelo RevenueCat (ex: `free` após expiração/cancelamento confirmado)

**Cancelar subscrição**
**Dado que** o utilizador tem uma subscrição Premium activa
**Quando** quer cancelar
**Então** é direccionado para a gestão de subscrição nativa da store (App Store / Google Play), já que o cancelamento não é feito dentro da app

## Critérios de aceitação
- [ ] Ecrã de upgrade com tabela de comparação dos 3 planos e destaque visual "Melhor valor" no Anual
- [ ] `src/lib/revenuecat.ts` configurado com `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, inicializado no arranque da app associado ao `user_id` do Supabase Auth
- [ ] Fluxo de compra funcional em ambas as plataformas (sandbox) para Premium Mensal e Premium Anual
- [ ] Componente reutilizável de "lock" premium (ícone + CTA) usado nos pontos de bloqueio já identificados noutras tickets (planner, macros, export Reminders, limites de despensa/favoritos)
- [ ] Botão/acção "restaurar compras" funcional
- [ ] Ecrã de perfil mostra o plano activo e, se aplicável, data de renovação
- [ ] Edge Function webhook do RevenueCat implementada em `supabase/functions/` a actualizar `profiles.plano` (com validação de assinatura do webhook)
- [ ] `profiles.revenuecat_id` associado correctamente ao criar/actualizar subscrição
- [ ] Cancelamento redirecciona para a gestão nativa da store, sem tentar implementar cancelamento in-app
- [ ] Componentes extraídos para `src/components/` (ex: `paywall/`), cada um sob 150 linhas
- [ ] Cores e fontes exclusivamente via tokens de `src/constants/theme.ts` / `@emealia/config`
- [ ] Limites e preços de planos centralizados em `@emealia/config` (`PLANS`), não hardcoded nos ecrãs
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- Chaves `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` já estão previstas em `.env` — confirmar em research os identificadores de produto (entitlements) a configurar no RevenueCat dashboard para `premium_monthly` e `premium_annual`
- O webhook do RevenueCat deve ser uma Edge Function do Supabase separada (nunca no cliente), e precisa de validar a assinatura/authorization header do RevenueCat antes de confiar no payload
- `profiles.plano` tem de ser a fonte única de verdade lida por todas as outras features (F05 despensa, F06 favoritos, F07 lista de compras/export, F09 planner) — confirmar em research se essas features já leem `plano` de `profiles` directamente ou via um hook partilhado (ex: `usePlan`/`useEntitlements`) a criar em `@emealia/supabase` ou `src/hooks/`
- Testes de compra requerem sandbox: StoreKit Testing/TestFlight no iOS, licence testers no Google Play — confirmar em research o setup necessário antes de builds EAS de preview/produção
- Apple Developer Account (€99/ano) e Google Play Console (taxa única $25) são pré-requisitos de infraestrutura já assinalados no CLAUDE.md, mas confirmar em research se já estão activos antes de assumir que os testes de compra reais são possíveis nesta fase
- Preço de referência do mercado: Samsung Food+ a $6,99/mês — eMealia posiciona-se abaixo, em €4,99/mês, como alternativa europeia mais acessível; este posicionamento deve estar reflectido no copy do ecrã de upgrade (a confirmar tom exacto em research/design)

## Fora do escopo
- Gestão de faturas, reembolsos ou disputas — geridos directamente pela App Store / Google Play
- Cancelamento in-app (fica delegado às definições nativas da store)
- Planos B2B, códigos promocionais ou trials gratuitos (não mencionados no pedido original)
- Ecrã de upgrade equivalente na app web (`apps/web/`) — apenas mobile (iOS + Android) nesta fase
- Analytics detalhado de conversão/funnel de upgrade

## Próximo passo
/research Como configurar produtos/entitlements no RevenueCat para `premium_monthly` e `premium_annual`, qual a estrutura recomendada da Edge Function webhook do Supabase para actualizar `profiles.plano` com validação segura do payload RevenueCat, se já existe (ou onde deve ficar) um hook partilhado de leitura do plano/entitlements para as features que já bloqueiam funcionalidades Premium (despensa, favoritos, lista de compras), e o setup de sandbox necessário para testar compras em iOS (StoreKit Testing) e Android (licence testers) antes de builds EAS.
