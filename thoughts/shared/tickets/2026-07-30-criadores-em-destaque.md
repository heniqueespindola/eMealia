---
data: 2026-07-30
status: backlog
prioridade: media
fase_mvp: nao
---

# Feature: Criadores em Destaque

## Contexto
Até agora o feed da homepage (F03) mostra vídeos curados em `video_cache` sem qualquer noção de "criador" como entidade — apenas o campo de texto `canal`. Esta feature introduz criadores parceiros como uma dimensão própria de descoberta: o utilizador passa a poder navegar por quem cozinha, não só pelo que é cozinhado, seguir os seus favoritos e ser avisado quando estes publicam. É o primeiro passo de uma relação de médio prazo entre a app e criadores de conteúdo culinário lusófonos/ibéricos, e a primeira feature do produto a exigir infraestrutura de notificações push (que hoje não existe).

## Comportamento esperado

**Descobrir criadores em destaque**
**Dado que** o utilizador abre a secção de Criadores em Destaque
**Quando** a lista carrega
**Então** vê os criadores parceiros com avatar, nome, canal, número de receitas e especialidade (ex: "Cozinha vegana rápida")

**Ver perfil de um criador**
**Dado que** o utilizador toca num criador na lista
**Quando** o perfil abre
**Então** vê os vídeos mais recentes/populares desse criador, obtidos de `video_cache`

**Seguir e deixar de seguir**
**Dado que** o utilizador está no perfil de um criador ou na lista de destaque
**Quando** toca em "Seguir"
**Então** o criador passa a constar de `followed_creators` para esse utilizador, e o botão muda para "A seguir" (com opção de deixar de seguir, que remove o registo)

**Tab "A seguir" na homepage**
**Dado que** o utilizador segue um ou mais criadores
**Quando** selecciona a tab "A seguir" na homepage
**Então** o feed filtra apenas vídeos de `video_cache` cujo criador conste em `followed_creators` para esse utilizador

**Tab "A seguir" sem criadores seguidos**
**Dado que** o utilizador não segue nenhum criador
**Quando** selecciona a tab "A seguir"
**Então** vê um estado vazio a convidar a explorar Criadores em Destaque

**Notificação de novo vídeo**
**Dado que** um criador seguido tem um novo vídeo adicionado a `video_cache`
**Quando** essa actualização acontece
**Então** os utilizadores que seguem esse criador recebem uma notificação push

## Critérios de aceitação
- [ ] Tabela `followed_creators` (`user_id`, `creator_channel_id`, `followed_at`) criada em `supabase/schema.sql` com RLS (utilizador só acede às suas próprias subscrições)
- [ ] Secção/ecrã "Criadores em Destaque" com lista de criadores parceiros (avatar, nome, canal, nº receitas, especialidade)
- [ ] Ecrã de perfil de criador com vídeos recentes/populares vindos de `video_cache`
- [ ] Botão seguir/deixar de seguir funcional no perfil e/ou na lista
- [ ] Tab "A seguir" na homepage a filtrar o feed existente (`useFeed`/`CarouselStrip`) por criadores seguidos, com estado vazio quando não há nenhum
- [ ] Notificação push disparada quando `video_cache` recebe um novo vídeo de um criador seguido
- [ ] Componentes extraídos para `src/components/` (ex: `creators/`), cada um sob 150 linhas
- [ ] Cores e fontes exclusivamente via tokens de `@emealia/config`/`theme.ts`
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- **Não existe identificador estável de criador hoje**: `video_cache` (`supabase/schema.sql:139`) só tem `canal` (texto livre) e `youtube_id` (id do vídeo, não do canal) — não há coluna de channel id. `creator_channel_id` em `followed_creators` implica adicionar essa coluna a `video_cache` (e preenchê-la no processo de cache dos vídeos), ou introduzir uma tabela própria de criadores parceiros com id estável, mapeada por `canal`/`youtube_id`. A confirmar em research.
- **Lista de "criadores parceiros" não tem fonte de dados**: os critérios (avatar, nº de receitas, especialidade) não existem em nenhuma tabela actual. Provavelmente exige uma tabela nova (ex: `creators`) curada manualmente, distinta de `followed_creators`— confirmar em research se "criador parceiro" é um subconjunto curado ou todo o universo de canais presentes em `video_cache`.
- **Infra de push notifications não existe ainda**: apesar de `expo-notifications` estar listado nas dependências do MVP, não há nenhum uso actual de `Notifications.*`, nem coluna de push token em `profiles`, nem Edge Function de envio. Esta feature implica construir essa infra de raiz (registo de push token no dispositivo, coluna `profiles.expo_push_token` ou tabela dedicada, e uma Edge Function/trigger que despacha notificação quando `video_cache` ganha uma linha nova de um criador seguido).
- **Trigger de "novo vídeo"**: confirmar em research o mecanismo — trigger de Postgres em `INSERT` sobre `video_cache` a invocar Edge Function, vs. job periódico que compara `cached_at` desde a última execução. O processo que popula `video_cache` hoje não está documentado neste repo (assumir que é externo/manual/cron fora do MVP actual).
- Reutilizar `useFeed`/`CarouselStrip`/`Pill` existentes (`apps/mobile/src/hooks/useFeed.ts`, `apps/mobile/src/components/feed/`) para a tab "A seguir" — apenas a origem dos dados muda (filtrar por `creator_channel_id` em vez de/além de `filtros`)
- `followed_creators` sem FK directa para uma tabela `creators` se essa tabela não existir — avaliar em research se `creator_channel_id` referencia `video_cache.canal`/nova coluna, ou uma tabela de criadores dedicada

## Fora do escopo
- Onboarding de criadores parceiros (painel para o próprio criador gerir o seu perfil) — gestão é manual/admin nesta fase
- Métricas para criadores (visualizações geradas pela app, followers, etc.)
- Notificações push para outros eventos além de "novo vídeo de criador seguido" (ex: sugestões de jantar, alertas de despensa já mencionados no stack — ficam fora desta feature)
- Monetização/parcerias comerciais com criadores
- Ecrã equivalente na app web (`apps/web/`)

## Próximo passo
/research Como identificar criadores de forma estável a partir de `video_cache` (nova coluna `creator_channel_id` vs. tabela `creators` dedicada), se "criadores em destaque" é um subconjunto curado com dados próprios (avatar, nº receitas, especialidade) ou derivado do universo de `video_cache`, como construir a infra de push notifications ainda inexistente no projecto (registo de token, tabela/coluna, Edge Function de envio) e qual o mecanismo de disparo quando `video_cache` recebe um novo vídeo de um criador seguido.
