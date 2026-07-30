---
data: 2026-07-30
status: backlog
prioridade: media
fase_mvp: nao
---

# Feature: Integração com Apps de Saúde (F14)

## Contexto
Feature Premium referenciada como "F14" na nota de fora-de-escopo de F10 (Contagem de Macros Avançada). Fecha o ciclo de valor do dashboard de macros: em vez de o utilizador Premium só ver os seus totais dentro da eMealia, os dados de calorias e macros de cada refeição planeada passam a reflectir-se automaticamente no Apple Health (iOS) ou Google Fit (Android) — o hub de saúde que o utilizador já usa para acompanhar peso, treino, sono, etc. Isto reduz fricção de registo manual duplicado e reforça a proposta de "planeamento sem stress" também no acompanhamento nutricional.

## Comportamento esperado

**Autorizar sincronização (iOS)**
**Dado que** um utilizador Premium em iOS ainda não autorizou a eMealia a escrever no Apple Health
**Quando** activa o toggle de sincronização no ecrã de configuração
**Então** a app pede autorização nativa do HealthKit para escrever dados nutricionais (energia, proteínas, hidratos, gorduras), e o toggle só fica activo se a autorização for concedida

**Autorizar sincronização (Android)**
**Dado que** um utilizador Premium em Android ainda não autorizou a eMealia
**Quando** activa o toggle de sincronização no ecrã de configuração
**Então** a app pede autorização OAuth para a Google Fit REST API (scope de nutrição), e o toggle só fica activo se a autorização for concedida

**Exportar macros de uma refeição planeada**
**Dado que** a sincronização está activa e o utilizador tem refeições em `meal_plan` para o dia
**Quando** o sync corre (manual ou automático)
**Então** as calorias e macros (proteínas, hidratos, gorduras) de cada refeição planeada desse dia são exportadas como registos nutricionais na plataforma de saúde do sistema operativo, sem duplicar registos já enviados anteriormente

**Ecrã de configuração de sincronização**
**Dado que** o utilizador Premium acede às configurações de saúde (a partir de `profile.tsx`)
**Quando** abre o ecrã
**Então** vê um toggle on/off de sincronização, a plataforma detectada (Apple Health / Google Fit consoante o SO), e a data/hora do último sync bem-sucedido

**Sync automático diário**
**Dado que** a sincronização está activa e o plano semanal do utilizador tem refeições registadas para o dia
**Quando** chega a hora do sync diário agendado (ou o utilizador abre a app nesse dia sem sync ainda feito)
**Então** os totais do dia são exportados automaticamente sem acção manual, e a data de último sync é actualizada

**Desactivar sincronização**
**Dado que** o utilizador tem a sincronização activa
**Quando** desliga o toggle
**Então** a app pára de exportar novos dados (não apaga o que já foi escrito no Health/Fit, já que a app não tem esse controlo sobre dados de terceiros)

**Bloqueio para utilizadores não-Premium**
**Dado que** o utilizador está no plano `free`
**Quando** tenta aceder ao ecrã de configuração de sincronização de saúde
**Então** vê o ecrã de bloqueio Premium reutilizado (`PremiumLock`), sem acesso ao toggle ou autorização

## Critérios de aceitação
- [ ] Ecrã de configuração de sincronização de saúde, acessível a partir de `profile.tsx`, com toggle on/off e data/hora do último sync
- [ ] Fluxo de autorização HealthKit em iOS (módulo nativo — confirmar biblioteca em research, já que `expo-health` não é um pacote Expo oficial)
- [ ] Fluxo de autorização Google Fit REST API em Android (confirmar em research se a API ainda está disponível ou se foi descontinuada a favor do Health Connect)
- [ ] Exportação de calorias + macros (proteínas, hidratos, gorduras) por refeição planeada, reaproveitando os totais já persistidos em `macro_daily_totals` (F10) em vez de recalcular
- [ ] Sync automático diário quando existem refeições planeadas para o dia, sem duplicar registos já exportados
- [ ] Acesso restrito a `premium_monthly`/`premium_annual`, com `PremiumLock` reutilizado
- [ ] Build requer EAS custom dev client (módulos nativos de Health/Fit não funcionam em Expo Go) — confirmar impacto no fluxo de desenvolvimento
- [ ] Componentes extraídos para `src/components/` (ex: `health/`), cada um sob 150 linhas
- [ ] Cores e fontes exclusivamente via tokens de `@emealia/config`/`theme.ts`
- [ ] RLS confirmado em qualquer nova tabela/coluna — utilizador só acede aos seus próprios dados
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- **`expo-health` não existe como pacote Expo oficial**: confirmar em research qual biblioteca usar para HealthKit em iOS (ex: `react-native-health`, ou um config plugin dedicado) — vai implicar sempre um módulo nativo e por isso um custom dev client via EAS Build, nunca Expo Go
- **Google Fit REST API pode estar em fim de vida**: a Google tem vindo a descontinuar APIs do Google Fit a favor do Health Connect (Android). Confirmar em research o estado actual da API antes de comprometer a implementação a "Google Fit REST API" tal como pedido — pode ser necessário direccionar para Health Connect em alternativa
- **Fonte de dados já existe**: `macro_daily_totals` (criada em F10, `supabase/schema.sql`) já persiste totais diários de calorias/proteínas/hidratos/gorduras por utilizador+dia via `useMacroDailyTotalsSync` — o export para Health/Fit deve ler daqui, não recalcular a partir de `meal_plan`
- **Sem onde guardar preferências de sync hoje**: não existem colunas em `profiles` nem tabela dedicada para `sync_ativo`, `plataforma_saude`, `ultimo_sync_em`. Confirmar em research se se estende `profiles` (como foi feito para `expo_push_token` em F11 e `notificacoes_prefs` em F13) ou se se cria tabela dedicada (ex: `health_sync_settings`)
- **Sync automático diário — mecanismo a definir em research**: background tasks em iOS são pouco fiáveis para trabalho agendado fixo; alternativas incluem `expo-task-manager`/`expo-background-fetch` no cliente, ou disparo em foreground quando a app abre e detecta que o dia ainda não foi sincronizado (padrão mais simples e mais fiável, dado que a app já tem `useMacroDailyTotalsSync` a correr em foreground). Um cron do lado do servidor não pode escrever directamente no HealthKit/Google Fit do dispositivo — a escrita tem de partir do cliente
- **Bloqueio Premium**: `PremiumLock` já existe em `apps/mobile/src/components/paywall/PremiumLock.tsx`, reutilizado em F09/F10 — confirmar em research o hook de leitura do plano activo já usado lá
- Nenhuma API key de terceiros está envolvida aqui (HealthKit é on-device; Google Fit/Health Connect usa OAuth do utilizador) — não se aplicam as regras de Edge Function que existem para YouTube/Spoonacular

## Fora do escopo
- Importar dados do Apple Health / Google Fit para dentro da eMealia (a sincronização é apenas de saída: eMealia → Health/Fit)
- Sincronizar outros dados além de calorias e macros das refeições planeadas (peso, água, exercício, sono, etc.)
- Ecrã equivalente na app web (`apps/web/`) — HealthKit e Google Fit não existem em browser
- Apps companion para watchOS / Wear OS
- Notificações push a confirmar sucesso/falha do sync (por omissão, o estado fica visível apenas no ecrã de configuração)

## Próximo passo
/research Qual biblioteca usar para HealthKit em iOS já que `expo-health` não existe como pacote Expo oficial (e implicações de custom dev client via EAS Build), estado actual da Google Fit REST API vs. necessidade de migrar para Health Connect no Android, onde persistir as preferências de sincronização (extensão de `profiles` vs. tabela `health_sync_settings` dedicada, seguindo o padrão de F11/F13), e o mecanismo mais fiável para o sync automático diário dado que `macro_daily_totals` (F10) já contém os totais a exportar.
