---
data: 2026-07-24
status: backlog
prioridade: alta
fase_mvp: sim
---

# Feature: Lista de Compras Automática

## Contexto
A lista de compras automática é o ecrã F07 do MVP e fecha o ciclo "descoberta → despensa → cozinhar": depois de o utilizador encontrar uma receita (F03/F04) ou planear a semana (F09), esta feature traduz automaticamente essa intenção numa lista de ingredientes em falta, comparando com o que já está na despensa (F05). Sem isto, o utilizador teria de comparar manualmente os ingredientes da receita com o que tem em casa — exactamente o atrito que a proposta de valor da app ("Cozinha o que tens. Descobre o que queres.") quer eliminar. A exportação para Reminders/Tasks é o que torna a lista acionável fora da app, no momento da compra, e funciona como um dos ganchos de conversão para Premium.

## Comportamento esperado

**Gerar lista a partir de uma receita**
**Dado que** o utilizador está a ver uma receita (guardada ou vinda de pesquisa)
**Quando** escolhe "adicionar à lista de compras"
**Então** os ingredientes da receita são comparados com `pantry_items` do utilizador e apenas os ingredientes em falta são inseridos em `shopping_list`, associados ao `recipe_id` de origem

**Gerar lista consolidada a partir do plano semanal**
**Dado que** o utilizador tem receitas atribuídas em `meal_plan` para a semana actual
**Quando** escolhe "gerar lista da semana"
**Então** todos os ingredientes de todas as receitas da semana são consolidados (sem duplicados), comparados com `pantry_items`, e apenas os itens em falta são inseridos em `shopping_list`

**Adicionar item manualmente**
**Dado que** o utilizador está no ecrã da lista de compras
**Quando** escreve o nome de um item no campo de adição manual
**Então** vê sugestões de autocomplete (baseadas em ingredientes comuns ou no histórico de `pantry_items`/`shopping_list`) e pode confirmar a inserção de um novo item em `shopping_list`

**Marcar item como comprado**
**Dado que** existe um item na lista
**Quando** o utilizador toca no checkbox do item
**Então** o campo `comprado` é actualizado para `true` (ou `false` ao desmarcar), com feedback visual imediato (ex: risco no texto)

**Eliminar item individual**
**Dado que** existe um item na lista
**Quando** o utilizador desliza ou toca em eliminar sobre esse item
**Então** o item é removido de `shopping_list` após confirmação (se for uma acção destrutiva sem undo) ou imediatamente com opção de desfazer

**Limpar lista completa**
**Dado que** a lista tem um ou mais itens
**Quando** o utilizador escolhe "limpar lista"
**Então** é pedida confirmação e, ao confirmar, todos os itens do utilizador em `shopping_list` são eliminados

**Exportar para Reminders/Tasks (Premium)**
**Dado que** o utilizador está no plano `premium_monthly` ou `premium_annual`
**Quando** escolhe "exportar para Lembretes/Tasks"
**Então** os itens não comprados da lista são exportados para o Apple Reminders (iOS, via EventKit) ou Google Tasks (Android)

**Exportação bloqueada no plano Grátis**
**Dado que** o utilizador está no plano `free`
**Quando** tenta exportar para Reminders/Tasks
**Então** vê uma mensagem a explicar que a exportação é uma funcionalidade Premium, com sugestão de upgrade, e a exportação não é executada

**Partilhar lista como texto**
**Dado que** o utilizador está no ecrã da lista de compras
**Quando** escolhe "partilhar"
**Então** o sistema abre a share sheet nativa com a lista formatada como texto simples (disponível em todos os planos)

## Critérios de aceitação
- [ ] Ecrã de lista de compras (dentro de `app/(tabs)/` ou acessível a partir de receita/planner — confirmar em research) com listagem dos itens de `shopping_list`, agrupados por comprado/por comprar
- [ ] Hook `src/hooks/useShoppingList.ts` a encapsular CRUD de `shopping_list` via Supabase, respeitando RLS
- [ ] Lógica de comparação receita → despensa: gerar itens em falta a partir dos ingredientes de uma receita vs. `pantry_items` (normalização de nomes a confirmar em research)
- [ ] Lógica de consolidação plano semanal → lista: agregar ingredientes de todas as receitas em `meal_plan` da semana actual, sem duplicados, comparando com `pantry_items`
- [ ] Adição manual de item com autocomplete
- [ ] Checkbox para marcar/desmarcar item como comprado (`comprado`)
- [ ] Eliminação individual de item e acção "limpar lista" (com confirmação)
- [ ] Exportação para Apple Reminders (iOS, EventKit) e Google Tasks (Android), restrita a `premium_monthly`/`premium_annual`, com mensagem de upgrade no plano `free`
- [ ] Partilha da lista como texto via share sheet nativa (disponível em todos os planos)
- [ ] Componentes extraídos para `src/components/` (ex: `shopping/`), cada um sob 150 linhas
- [ ] Cores e fontes exclusivamente via tokens de `src/constants/theme.ts` / `@emealia/config`
- [ ] RLS confirmado em `shopping_list` — utilizador só acede aos seus próprios itens
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- **Bloqueio a resolver em research:** nem `saved_recipes` nem `meal_plan` guardam a lista de ingredientes da receita (`supabase/schema.sql` só tem `recipe_id`, `titulo`, `fonte`, `macros`). A comparação "ingredientes da receita vs. despensa" precisa de uma fonte para os ingredientes — via chamada à Spoonacular (Edge Function, por `recipe_id`) para receitas dessa fonte, e a confirmar o que fazer para receitas de vídeo (YouTube/TikTok/Instagram) que não têm lista estruturada de ingredientes na Spoonacular
- Normalização de nomes de ingredientes (ex: "tomate" vs "tomates", plural/singular, acentos) é necessária para a comparação com `pantry_items.nome` não falhar por diferenças triviais de texto — decidir abordagem em research (normalização simples client-side vs. função no Supabase)
- Exportação EventKit (iOS) e Google Tasks API (Android) requer módulo nativo ou `expo-calendar`/API dedicada — confirmar em research se `expo-calendar` cobre Reminders no iOS ou se é necessário um módulo nativo dedicado; Google Tasks API pode requerer OAuth adicional (fora do fluxo Supabase Auth actual)
- Restrição Premium da exportação deve usar `PLANS`/`LIMITS` de `@emealia/config`, tal como o padrão já usado em despensa (F05) e favoritos (F06), em vez de valores hardcoded no ecrã
- `shopping_list.recipe_id` permite rastrear a receita de origem de um item — usar para eventual agrupamento visual "itens de [receita X]" na lista consolidada
- Depende indirectamente do planeamento semanal (`meal_plan`) para a função de "gerar lista da semana" — confirmar em research se o ecrã de planner (F09, Fase 2) já existe ou se esta função fica prevista mas sem UI de planner por trás nesta fase

## Fora do escopo
- Ecrã de planeamento semanal em si (`app/(tabs)/planner.tsx`) — isso é F09 (Fase 2); esta ticket apenas consome dados de `meal_plan` se existirem
- Preços ou orçamento estimado da lista de compras
- Integração com apps de supermercado ou entrega ao domicílio
- Partilha colaborativa da lista entre múltiplos utilizadores
- Ecrã equivalente na app web (`apps/web/`)

## Próximo passo
/research Como obter a lista de ingredientes de uma receita para comparação com `pantry_items` (visto que `saved_recipes`/`meal_plan` não guardam ingredientes estruturados), qual a abordagem de normalização de nomes para essa comparação, como implementar a exportação nativa para Apple Reminders (EventKit/expo-calendar) e Google Tasks API a partir de Expo, e onde encaixar o ecrã de lista de compras na navegação (`app/(tabs)/`)?
