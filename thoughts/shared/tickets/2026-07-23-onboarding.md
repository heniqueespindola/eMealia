---
data: 2026-07-23
status: backlog
prioridade: alta
fase_mvp: sim
---

# Feature: Onboarding (3 Ecrãs)

## Contexto
Um utilizador novo precisa de configurar as suas preferências dietéticas, adicionar os primeiros ingredientes à despensa e definir os seus filtros favoritos antes de chegar à homepage — sem isto, o feed de vídeos e a pesquisa por ingredientes não têm dados suficientes para serem relevantes. Esta é a feature F02 do MVP, exibida apenas na primeira abertura da app (após registo, conforme F01 — Autenticação), e é pré-requisito para que a homepage e a pesquisa por ingredientes façam sentido para o utilizador desde o início.

## Comportamento esperado
Fluxo linear de 3 ecrãs (`app/onboarding/step1.tsx`, `step2.tsx`, `step3.tsx`) exibido apenas uma vez, na primeira abertura da app após registo. Cada ecrã tem um botão "Próximo" e um indicador de progresso (1/3, 2/3, 3/3). No final do passo 3, os dados são guardados na tabela `profiles` do Supabase e o utilizador é redireccionado para a homepage.

**Passo 1 — Boas-vindas e preferências dietéticas**
**Dado que** um utilizador acabou de se registar e nunca completou o onboarding
**Quando** abre a app pela primeira vez
**Então** vê o ecrã de boas-vindas com selecção multi-select de preferências dietéticas (vegan, vegetariano, sem glúten, sem lactose, airfryer, rápidas) e um botão "Próximo" (indicador 1/3)

**Passo 2 — Primeiros ingredientes da despensa**
**Dado que** o utilizador completou o passo 1
**Quando** avança para o passo 2
**Então** vê sugestões de ingredientes comuns (ovo, massa, tomate, etc.) para adicionar à despensa, com o botão "Próximo" desactivado até seleccionar pelo menos 3 (indicador 2/3)

**Passo 3 — Filtros favoritos e frequência de cozinha**
**Dado que** o utilizador completou o passo 2
**Quando** avança para o passo 3
**Então** vê selecção de filtros favoritos e frequência de cozinha semanal, com botão "Concluir" (indicador 3/3)

**Dado que** o utilizador conclui o passo 3
**Quando** submete
**Então** os dados de todos os 3 passos são guardados em `profiles` no Supabase e o utilizador é redireccionado para a homepage

**Dado que** um utilizador já completou o onboarding anteriormente
**Quando** volta a abrir a app
**Então** o fluxo de onboarding não é exibido novamente — vai directo para a homepage (ou login, se sem sessão)

## Critérios de aceitação
- [ ] Ecrã `app/onboarding/step1.tsx` — boas-vindas + multi-select de preferências dietéticas (vegan, vegetariano, sem_gluten, sem_lactose, airfryer, rapida)
- [ ] Ecrã `app/onboarding/step2.tsx` — sugestões de ingredientes comuns para despensa, selecção múltipla, mínimo de 3 para activar "Próximo"
- [ ] Ecrã `app/onboarding/step3.tsx` — selecção de filtros favoritos + frequência de cozinha semanal, botão "Concluir"
- [ ] Indicador de progresso visível nos 3 ecrãs (1/3, 2/3, 3/3), em âmbar `#FFB162` (primary)
- [ ] Botão "Próximo"/"Concluir" em âmbar `#FFB162`, desactivado no passo 2 até 3 ingredientes seleccionados
- [ ] Fundo `#EEE9DF` (pergaminho / bgLight) nos 3 ecrãs
- [ ] Ao concluir o passo 3: preferências dietéticas gravadas em `profiles.filtros_dieteticos`, ingredientes iniciais gravados em `pantry_items` (um registo por ingrediente, associado ao `user_id`), filtros favoritos e frequência de cozinha gravados em `profiles`
- [ ] Flag de conclusão do onboarding persistida em `profiles` (para nunca voltar a mostrar o fluxo ao mesmo utilizador)
- [ ] Fluxo só é exibido na primeira abertura — utilizadores que já completaram o onboarding vão directo para a homepage
- [ ] Navegação entre passos preserva o estado já seleccionado (ex: voltar ao passo 1 não perde o que foi escolhido no passo 2, se aplicável)
- [ ] Texto em português europeu (pt-PT), tom prático e encorajador conforme guia de marca
- [ ] Cores e fontes vindas de `src/constants/theme.ts` (tokens `colors` e `fonts`), nunca hardcoded nos componentes
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- Depende de F01 (Autenticação) já estar implementada — o onboarding pressupõe que existe um `user_id` autenticado e um registo em `profiles`
- Confirmar se a gravação em `pantry_items` deve incluir campos adicionais (quantidade, expira_em) no passo 2, ou apenas `nome` — provavelmente apenas `nome` neste fluxo inicial, dado que é "adicionar rapidamente", não gestão completa de despensa
- Definir onde fica a flag de conclusão do onboarding — pode ser um novo campo em `profiles` (ex: `onboarding_completo boolean DEFAULT false`) já que o schema actual não a inclui; a adicionar ao `supabase/schema.sql`
- A verificação "já completou onboarding?" deve acontecer num layout guard (semelhante à protecção de rotas de F01), provavelmente em `app/_layout.tsx` ou num layout do grupo de onboarding, redireccionando conforme o estado de `profiles.onboarding_completo`
- "Frequência de cozinha semanal" (passo 3) não tem campo definido no schema actual de `profiles` — definir se é um novo campo (ex: `frequencia_cozinha int` ou enum) ou se é armazenado em `filtros_dieteticos`/campo próprio
- Cache de sugestões de ingredientes comuns (passo 2) pode ser uma lista estática local, sem necessidade de chamada a APIs externas (Spoonacular/Open Food Facts) nesta fase
- Considerar reutilizar componentes de `src/components/ui/` (Button, Pill) para as opções multi-select e indicador de progresso

## Fora do escopo
- Barcode scanner para adicionar ingredientes no passo 2 (fica para F05 — Despensa)
- Edição/alteração das preferências definidas no onboarding após conclusão (isso é gerido depois em `profile.tsx`)
- Onboarding na app web (`apps/web/`)
- Skip/saltar o onboarding — o fluxo é obrigatório na primeira abertura
- Animações de transição complexas entre passos

## Próximo passo
/research Como estruturar o fluxo de onboarding de 3 passos em Expo Router (`app/onboarding/`), incluindo persistência de estado entre ecrãs, gravação final em `profiles`/`pantry_items` no Supabase, e o guard que impede reexibição do onboarding a utilizadores que já o completaram?
