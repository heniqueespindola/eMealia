---
data: 2026-07-24
status: backlog
prioridade: alta
fase_mvp: sim
---

# Feature: Favoritos e Coleções

## Contexto
Favoritos e coleções é o ecrã F06 do MVP e é o que dá permanência à descoberta feita no feed de vídeos (F03) e na pesquisa por ingredientes (F04): sem um sítio para guardar e organizar o que o utilizador encontra, cada receita interessante perde-se assim que o utilizador sai do ecrã. É também a funcionalidade que liga fontes heterogéneas (Spoonacular, YouTube, TikTok, Instagram) numa mesma experiência de "as minhas receitas", coerente com a proposta de valor de agregação da app. A organização em coleções nomeadas (ex: "Para experimentar", "Semana") permite ao utilizador estruturar o planeamento informal das suas refeições antes mesmo de existir o planeamento semanal formal (F07/Premium).

## Comportamento esperado

**Listagem de receitas guardadas**
**Dado que** o utilizador tem receitas em `saved_recipes`
**Quando** abre o ecrã de favoritos
**Então** vê uma lista/grid com thumbnail, título, badge colorido da fonte (YouTube vermelho, TikTok preto, Instagram roxo, eMealia/Spoonacular âmbar), tempo de preparação e calorias de cada receita

**Coleções por omissão**
**Dado que** o utilizador ainda não criou nenhuma coleção
**Quando** guarda a primeira receita
**Então** a receita é atribuída à coleção "Favoritos" por omissão, e as coleções "Para experimentar" e "Semana" estão disponíveis para seleccionar desde o início

**Criar coleção**
**Dado que** o utilizador está no ecrã de favoritos
**Quando** toca em "criar coleção" e escreve um nome personalizado
**Então** a nova coleção fica disponível para atribuir receitas, sem limite de coleções distinto do limite de receitas

**Eliminar coleção**
**Dado que** existe uma coleção criada pelo utilizador (não uma coleção por omissão)
**Quando** o utilizador escolhe eliminar essa coleção
**Então** é pedida confirmação e, ao confirmar, a coleção é removida; as receitas que lá estavam são movidas para "Favoritos" (não são eliminadas)

**Mover receita entre coleções (long-press)**
**Dado que** o utilizador faz toque longo sobre uma receita guardada
**Então** vê a lista de coleções existentes e pode seleccionar uma para mover a receita, actualizando `colecao` em `saved_recipes`

**Filtrar favoritos**
**Dado que** o utilizador está no ecrã de favoritos
**Quando** aplica um filtro dietético (ex: vegan, sem_gluten) ou um filtro de fonte (YouTube, TikTok, Instagram, Spoonacular)
**Então** a lista é reduzida às receitas que correspondem ao(s) filtro(s) seleccionado(s), dentro da coleção actual

**Ver macros completos**
**Dado que** o utilizador toca numa receita guardada
**Quando** o detalhe é apresentado
**Então** vê os macros completos (calorias, proteínas, hidratos, gorduras) tal como guardados em `saved_recipes.macros`

**Abrir receita original**
**Dado que** o utilizador está a ver uma receita guardada
**Quando** toca no botão de acesso rápido à fonte original
**Então** se a fonte for YouTube a app abre um embed do vídeo; se for outra fonte (TikTok, Instagram, blog/Spoonacular) abre o `source_url` num browser externo/in-app

**Limite do plano Grátis**
**Dado que** o utilizador está no plano `free` e já tem 10 receitas guardadas em `saved_recipes`
**Quando** tenta guardar uma nova receita
**Então** vê uma mensagem a informar do limite atingido e uma sugestão de upgrade para Premium, sem guardar a receita

**Sem limite no Premium**
**Dado que** o utilizador está no plano `premium_monthly` ou `premium_annual`
**Quando** guarda receitas
**Então** não há limite de quantidade de receitas guardadas

## Critérios de aceitação
- [ ] Ecrã de favoritos (dentro de `app/(tabs)/`, ex: aba própria ou secção do perfil — confirmar em research) com lista/grid de receitas guardadas: thumbnail, título, badge de fonte, tempo e calorias
- [ ] Hook `src/hooks/useSavedRecipes.ts` (ou equivalente) a encapsular CRUD de `saved_recipes` via Supabase, respeitando RLS
- [ ] UI de coleções: criar coleção com nome personalizado, eliminar coleção (com migração das receitas para "Favoritos"), navegar entre coleções
- [ ] Coleções por omissão ("Favoritos", "Para experimentar", "Semana") disponíveis desde o primeiro uso
- [ ] Mover receita entre coleções via long-press, com feedback visual da acção
- [ ] Filtro por filtro dietético (`filtros`) e por fonte (`fonte`) aplicado dentro da coleção actual
- [ ] Ecrã/modal de detalhe da receita guardada com macros completos (`macros` jsonb)
- [ ] Botão de acesso rápido: embed YouTube para receitas com `fonte='youtube'`, abertura de `source_url` externo para as restantes fontes
- [ ] Validação de limite de 10 receitas guardadas no plano `free` (bloqueio de novo save + mensagem de upgrade), sem limite em `premium_monthly`/`premium_annual`
- [ ] Componentes extraídos para `src/components/recipe/` (ex: reutilizar/estender `RecipeCard`), cada um sob 150 linhas
- [ ] Cores e fontes exclusivamente via tokens de `src/constants/theme.ts` (incl. cores de badges de fonte já definidas: `youtube`, `tiktok`, `instagram`, `emealia`)
- [ ] RLS confirmado em `saved_recipes` — utilizador só acede às suas próprias receitas guardadas
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- O schema actual de `saved_recipes` (`supabase/schema.sql`) tem `colecao text DEFAULT 'favoritos'` como campo de texto livre, não uma tabela de coleções separada — confirmar em `/research` se isto é suficiente para nomes personalizados e eliminação de coleções, ou se é necessário criar uma tabela `collections` (com `user_id`, `nome`, `created_at`) e uma FK em `saved_recipes`, para suportar melhor a listagem de coleções existentes por utilizador (hoje seria preciso um `SELECT DISTINCT colecao`)
- Ao eliminar uma coleção, as receitas devem ser reatribuídas a "Favoritos" — decidir em research se isto é um update em lote no cliente ou uma função/trigger no Supabase
- Botão "abrir receita original": para `fonte='youtube'` reutilizar o mesmo padrão de embed já usado no feed (F03); para as restantes fontes, confirmar se se usa `expo-web-browser` ou `Linking.openURL`
- Limite de 10 receitas (`free`) vs. ilimitado (`premium_*`) deve ler o campo `plano` de `profiles` — centralizar em `@emealia/config` (`PLANS`) tal como nas features de despensa e pesquisa, em vez de valores hardcoded no ecrã
- Botões de "guardar receita" no feed (F03) e na pesquisa (F04) devem passar a escrever em `saved_recipes` respeitando este mesmo limite — confirmar em research se esses ecrãs já têm essa integração ou se fica a cargo desta feature
- Badges de fonte devem usar as cores já definidas em `theme.ts` (`colors.youtube`, `colors.tiktok`, `colors.instagram`, `colors.emealia`), não cores novas

## Fora do escopo
- Lógica de "guardar receita" a partir do feed de vídeos (F03) ou da pesquisa (F04) — esta ticket cobre a gestão do que já está guardado, não o ponto de entrada de gravação (a confirmar em research se precisa de ajuste)
- Planeamento semanal de refeições (`meal_plan`) — isso é F07/Premium, mesmo que a coleção "Semana" sugira uma relação futura
- Lista de compras automática (F07)
- Partilha de coleções entre utilizadores ou coleções colaborativas
- Ecrã equivalente na app web (`apps/web/`)

## Próximo passo
/research Como estruturar o ecrã de favoritos e coleções, incluindo se o campo `colecao` (texto livre) em `saved_recipes` é suficiente para suportar nomes personalizados e eliminação de coleções ou se é necessária uma tabela `collections` separada, como implementar a reatribuição de receitas para "Favoritos" ao eliminar uma coleção, a integração do botão de acesso rápido (embed YouTube vs. abertura externa por fonte), e onde encaixar este ecrã na navegação (`app/(tabs)/`)?
