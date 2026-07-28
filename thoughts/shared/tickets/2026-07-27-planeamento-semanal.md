---
data: 2026-07-27
status: backlog
prioridade: media
fase_mvp: nao
---

# Feature: Planeamento Semanal de Refeições

## Contexto
F09 (Fase 2), exclusivo Premium — é a feature que justifica directamente a assinatura paga (€4,99/mês ou €34,99/ano), a par do export de lista de compras e das macros avançadas. Permite ao utilizador arrastar receitas guardadas (F06) ou encontradas por pesquisa (F04) para um calendário semanal por dia e momento de refeição, ver o impacto nos macros diários, e fechar o ciclo "planear → comprar" ao consolidar a lista de compras da semana inteira (F07). Sem esta feature, o utilizador tem de repetir manualmente o fluxo de pesquisa/despensa/lista todos os dias — o planeamento é o que transforma o eMealia de "app de receitas" em "app de gestão da cozinha da semana".

## Comportamento esperado

**Ver vista semanal**
**Dado que** o utilizador Premium abre o ecrã de planeamento (`app/(tabs)/planner.tsx`)
**Quando** o ecrã carrega
**Então** vê uma grelha com 7 colunas (Segunda a Domingo) da semana actual e 4 linhas (pequeno-almoço, almoço, jantar, lanche), com os slots já preenchidos a partir de `meal_plan` para essa `semana_inicio`

**Adicionar receita a um slot via pesquisa**
**Dado que** o utilizador toca num slot vazio
**Quando** escolhe "pesquisar receita" e selecciona um resultado
**Então** a receita é atribuída a esse slot (`dia_semana` + `momento`) e persistida em `meal_plan` com `recipe_id`, `titulo` e `fonte`

**Adicionar receita a um slot a partir dos favoritos**
**Dado que** o utilizador toca num slot vazio
**Quando** escolhe "dos favoritos" e selecciona uma receita guardada em `saved_recipes`
**Então** a receita é atribuída a esse slot e persistida em `meal_plan`

**Arrastar receita entre slots (drag-and-drop)**
**Dado que** um slot tem uma receita atribuída
**Quando** o utilizador arrasta o card da receita para outro slot (outro dia e/ou momento)
**Então** o registo em `meal_plan` é actualizado com o novo `dia_semana`/`momento`, sem duplicar a entrada

**Remover receita de um slot com swipe**
**Dado que** um slot tem uma receita atribuída
**Quando** o utilizador desliza sobre o card
**Então** a receita é removida do slot (eliminada de `meal_plan`), com feedback visual imediato

**Trocar receita de um slot com swipe**
**Dado que** um slot tem uma receita atribuída
**Quando** o utilizador desliza e escolhe "trocar"
**Então** abre-se o fluxo de pesquisa/favoritos e a nova selecção substitui a receita anterior nesse slot (`update` em vez de novo registo)

**Ver barra de macros diários**
**Dado que** um ou mais slots de um dia têm receitas atribuídas
**Quando** o utilizador visualiza a coluna desse dia
**Então** vê uma barra/resumo com o total de calorias, proteínas, hidratos e gorduras desse dia, calculado a partir dos `macros` das receitas planeadas (via `saved_recipes.macros` quando disponível, ou consulta a fonte da receita)

**Gerar lista de compras da semana**
**Dado que** a semana actual tem pelo menos uma receita planeada
**Quando** o utilizador toca em "gerar lista de compras"
**Então** os ingredientes de todas as receitas da semana são consolidados (sem duplicados), comparados com `pantry_items`, e os itens em falta são inseridos em `shopping_list` (reaproveitando a lógica de consolidação já prevista em F07)

**Navegar entre semanas**
**Dado que** o utilizador está no ecrã de planeamento
**Quando** avança ou recua para outra semana
**Então** a grelha mostra os slots correspondentes a essa `semana_inicio` (vazios se ainda não houver plano)

**Bloqueio para utilizadores não-Premium**
**Dado que** o utilizador está no plano `free`
**Quando** tenta aceder ao ecrã de planeamento
**Então** vê um ecrã de bloqueio com explicação da funcionalidade Premium e CTA de upgrade (reutilizando o componente de "lock" premium de F08), sem acesso à grelha nem a `meal_plan`

## Critérios de aceitação
- [ ] Ecrã `app/(tabs)/planner.tsx` com grelha semanal (7 dias × 4 momentos) para a `semana_inicio` actual, navegável para semanas anteriores/seguintes
- [ ] Hook `src/hooks/usePlanner.ts` a encapsular CRUD de `meal_plan` via Supabase, respeitando RLS
- [ ] Adicionar receita a um slot via pesquisa (F04) ou favoritos (F06)
- [ ] Drag-and-drop de receitas entre slots (dia/momento) com persistência imediata em `meal_plan`
- [ ] Swipe para remover ou trocar receita de um slot
- [ ] Barra/resumo de macros diários por coluna, calculado a partir das receitas planeadas
- [ ] Botão "gerar lista de compras" que consolida ingredientes em falta da semana em `shopping_list`
- [ ] Acesso ao ecrã restrito a `premium_monthly`/`premium_annual`, com ecrã de bloqueio e CTA de upgrade no plano `free` (usando o componente de lock premium de F08)
- [ ] Componentes extraídos para `src/components/` (ex: `planner/`), cada um sob 150 linhas
- [ ] Cores e fontes exclusivamente via tokens de `src/constants/theme.ts` / `@emealia/config`
- [ ] RLS confirmado em `meal_plan` — utilizador só acede aos seus próprios registos
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- Depende de F08 (Planos e pagamentos) para o mecanismo de leitura do plano activo (`usePlan`/`useEntitlements`, se já existir) e do componente de lock premium — confirmar em research o estado actual dessa dependência
- Depende de F07 (Lista de compras) para a lógica de consolidação receita→despensa; confirmar em research se a função "gerar lista da semana" já foi implementada em F07 ou fica por implementar aqui
- Cálculo de macros diários enfrenta o mesmo bloqueio identificado em F07: `meal_plan` só guarda `recipe_id`/`titulo`/`fonte`, não macros estruturados — confirmar em research se se usa `saved_recipes.macros` (quando a receita também está guardada) ou se é necessário ir buscar à Spoonacular via Edge Function por `recipe_id`, e o que fazer para receitas de vídeo sem macros estruturados
- Biblioteca de drag-and-drop a confirmar em research — `react-native-gesture-handler` (já na stack) é a base mais provável, possivelmente combinada com `react-native-reanimated@3.x` (nunca a v4, incompatível com Expo 53) para as animações do drag
- `semana_inicio` deve ser sempre a Segunda-feira da semana — confirmar em research a lógica de cálculo (timezone, `date-fns` ou equivalente) para evitar problemas de offset entre dispositivos/timezones dos utilizadores em Portugal/Espanha
- Um slot (dia+momento) pode ter no máximo uma receita de cada vez — a troca deve ser `update`, nunca criar duplicados em `meal_plan`

## Fora do escopo
- Ecrã de macros avançadas / objectivos nutricionais (isso é F10, Fase 2)
- Sugestões automáticas de receitas para preencher a semana (planeamento assistido/IA)
- Partilha ou colaboração do plano semanal entre múltiplos utilizadores
- Repetição automática de planos de semanas anteriores ("copiar semana passada")
- Ecrã equivalente na app web (`apps/web/`)

## Próximo passo
/research Como reutilizar a lógica de consolidação de ingredientes já prevista em F07 para o botão "gerar lista de compras" da semana, como obter macros estruturados por slot quando a receita não está em `saved_recipes` (bloqueio partilhado com F07), qual a biblioteca/abordagem de drag-and-drop mais adequada com `react-native-gesture-handler` + `reanimated@3.x` nesta grelha, e como o hook de leitura de plano/entitlements de F08 deve ser consumido aqui para bloquear o acesso ao ecrã no plano `free`.
