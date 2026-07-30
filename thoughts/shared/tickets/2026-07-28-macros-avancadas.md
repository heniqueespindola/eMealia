---
data: 2026-07-28
status: backlog
prioridade: media
fase_mvp: nao
---

# Feature: Contagem de Macros Avançada

## Contexto
F10 (Fase 2), exclusivo Premium — completa o trio de features que sustenta a assinatura paga junto de F07 (export de lista de compras) e F09 (planeamento semanal). Enquanto F09 mostra macros diários apenas como resumo do plano da semana em vista, F10 transforma isso num dashboard de nutrição com objectivos pessoais (baseados em peso, altura, actividade e objectivo), progresso visual por macro, histórico ao longo do tempo e alertas de desvio. É a feature que dá ao utilizador Premium uma razão para voltar à app mesmo nos dias em que não está a planear refeições — o valor está em acompanhar tendências, não só em ver o plano da semana actual.

## Comportamento esperado

**Definir objectivos nutricionais**
**Dado que** o utilizador Premium acede pela primeira vez ao dashboard de macros
**Quando** preenche peso, altura, nível de actividade e objectivo (perda, manutenção, ganho)
**Então** a app calcula e guarda objectivos diários de calorias, proteínas, hidratos e gorduras, editáveis manualmente a qualquer momento

**Ver totais diários**
**Dado que** o utilizador tem receitas planeadas em `meal_plan` para o dia actual
**Quando** abre o dashboard de macros
**Então** vê os totais de calorias, proteínas, hidratos e gorduras do dia, calculados a partir das receitas planeadas (reaproveitando a lógica de `usePlannerMacros`/`useRecipeMacros` já existente de F09)

**Ver progresso por macro**
**Dado que** os totais diários já foram calculados
**Quando** visualiza o dashboard
**Então** vê um gráfico de barras com o progresso de cada macro em relação ao objectivo diário (ex: 1400/2000 kcal), incluindo estado visual de "excedido" quando o total ultrapassa o objectivo

**Consultar histórico semanal e mensal**
**Dado que** existem dias com receitas planeadas em semanas/meses anteriores
**Quando** o utilizador muda para a vista de histórico e selecciona semana ou mês
**Então** vê os totais de macros agregados por dia (ou média do período), permitindo comparar com o objectivo ao longo do tempo

**Alerta de desvio calórico consistente**
**Dado que** o plano semanal do utilizador excede o objectivo calórico diário em vários dias consecutivos (ex: 4+ dos 7 dias)
**Quando** o utilizador abre a app ou o dashboard de macros
**Então** vê um alerta a assinalar o desvio, sem bloquear o uso normal da app

**Bloqueio para utilizadores não-Premium**
**Dado que** o utilizador está no plano `free`
**Quando** tenta aceder ao dashboard de macros
**Então** vê o ecrã de bloqueio Premium reutilizado de F08/F09 (`PremiumLock`), sem acesso aos objectivos, totais ou histórico

## Critérios de aceitação
- [ ] Ecrã de dashboard de macros (novo separador ou secção, a confirmar em research se fica em `profile.tsx`, `planner.tsx` ou ecrã próprio)
- [ ] Fluxo de definição/edição de objectivos nutricionais (peso, altura, actividade, objectivo → calorias/proteínas/hidratos/gorduras diários), persistido no Supabase
- [ ] Totais diários calculados a partir de `meal_plan` reaproveitando `usePlannerMacros`/`useRecipeMacros` de F09, sem duplicar lógica de fetch de macros
- [ ] Gráfico de barras de progresso por macro (calorias, proteínas, hidratos, gorduras) face ao objectivo diário, com estado visual de excedido
- [ ] Vista de histórico semanal e mensal com totais/médias por dia
- [ ] Alerta de desvio calórico consistente quando o plano semanal excede o objectivo em vários dias
- [ ] Acesso restrito a `premium_monthly`/`premium_annual`, com `PremiumLock` reutilizado de F08/F09 no plano `free`
- [ ] Componentes extraídos para `src/components/` (ex: `macros/`), cada um sob 150 linhas
- [ ] Cores e fontes exclusivamente via tokens de `@emealia/config`/`theme.ts`
- [ ] RLS confirmado nas novas tabelas/colunas — utilizador só acede aos seus próprios dados
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- **Objectivos nutricionais não têm onde ser guardados hoje**: `profiles` (`packages/types/src/user.ts`) não tem `peso`, `altura`, `actividade` nem `objectivo`, e não existe tabela de metas de macros em `supabase/schema.sql`. Confirmar em research se se estende `profiles` com estas colunas + colunas de objectivo calculado, ou se se cria tabela dedicada (ex: `macro_goals`)
- **Histórico não é persistido**: `meal_plan` guarda `semana_inicio`/`dia_semana`/`momento`/`recipe_id`, mas os totais de macros são calculados em runtime pelo cliente (`usePlannerMacros`), não guardados. Para histórico mensal isto implica recalcular macros por cada semana passada — potencialmente muitos pedidos à Edge Function Spoonacular para receitas antigas sem `macros` em `saved_recipes`. Avaliar em research se compensa persistir totais diários calculados (ex: tabela `macro_daily_totals` preenchida ao gravar/alterar `meal_plan`) para evitar recomputar histórico a cada abertura do dashboard
- **Reutilizar, não duplicar**: já existe `usePlannerMacros.ts`, `useRecipeMacros.ts` e `DayMacroBar.tsx` de F09 (`apps/mobile/src/hooks/`, `apps/mobile/src/components/planner/`) — a lógica de ir buscar macros por `recipe_id` (via `saved_recipes.macros` ou Edge Function Spoonacular com cache) deve ser partilhada, não reimplementada
- Fórmula de cálculo de objectivos (ex: Mifflin-St Jeor para TMB + factor de actividade + ajuste por objectivo) a definir em research/plan — confirmar se há preferência por fórmula específica ou se qualquer fórmula standard de nutrição serve
- `PremiumLock` já existe em `apps/mobile/src/components/paywall/PremiumLock.tsx` — reutilizar tal como em F09, confirmar em research o hook de leitura do plano activo já usado lá
- Alerta de desvio calórico: confirmar em research se é um alerta apenas visual dentro do dashboard, ou se deve também disparar notificação push (a app já usa Expo Push Notifications para outros alertas) — por omissão assumir apenas visual, notificação fica fora de escopo salvo indicação em contrário
- Dados de macros têm origem na Spoonacular API (via Edge Function, nunca API key no cliente) — cache já obrigatório a 1h por termos de uso, reaproveitar cache existente

## Fora do escopo
- Notificações push para o alerta de desvio calórico (apenas alerta visual no dashboard, salvo indicação em contrário)
- Integração com Apple Health / Google Fit (isso é F14, feature separada)
- Edição manual de macros por refeição fora do que já vem da receita (ex: ajustar porções)
- Recomendações automáticas de receitas para atingir objectivos em falta
- Ecrã equivalente na app web (`apps/web/`)

## Próximo passo
/research Onde e como guardar os objectivos nutricionais do utilizador (extensão de `profiles` vs. tabela `macro_goals` dedicada), se compensa persistir totais diários de macros numa nova tabela para suportar histórico semanal/mensal sem recomputar tudo a cada vez, como reaproveitar `usePlannerMacros`/`useRecipeMacros`/`DayMacroBar` de F09 sem duplicar lógica, e onde encaixa este dashboard na navegação existente (novo ecrã, separador, ou secção dentro de `profile.tsx`/`planner.tsx`).
