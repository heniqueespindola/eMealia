---
data: 2026-07-23
status: backlog
prioridade: alta
fase_mvp: sim
---

# Feature: Pesquisa por Ingredientes

## Contexto
A pesquisa por ingredientes é o ecrã central da app (F04 do MVP, `app/(tabs)/search.tsx`) e concretiza a proposta de valor "Cozinha o que tens. Descobre o que queres." O utilizador indica os ingredientes que tem disponíveis (manualmente ou a partir da sua despensa em `pantry_items`) e recebe receitas viáveis da Spoonacular API, filtradas por preferências dietéticas. Ao contrário da homepage (F03, descoberta passiva de vídeos), este ecrã serve a intenção activa "o que posso cozinhar agora com o que tenho" — por isso precisa de mostrar claramente que ingredientes faltam vs. que já estão disponíveis.

## Comportamento esperado

**Input de ingredientes com chips removíveis**
**Dado que** o utilizador está no ecrã de pesquisa
**Quando** escreve o nome de um ingrediente e confirma (ex: enter ou selecção de sugestão autocomplete)
**Então** o ingrediente aparece como chip removível (ex: "ovo" ×) na lista de ingredientes seleccionados, e o campo de input fica pronto para o próximo ingrediente

**Remover ingrediente**
**Dado que** existe pelo menos um chip de ingrediente na lista
**Quando** o utilizador toca no × do chip
**Então** o ingrediente é removido da lista e os resultados são recalculados

**Autocomplete de ingredientes**
**Dado que** o utilizador está a escrever no campo de input
**Quando** digita pelo menos 2 caracteres
**Então** vê uma lista de sugestões de ingredientes correspondentes, seleccionáveis por toque

**Usar despensa**
**Dado que** o utilizador tem ingredientes registados em `pantry_items`
**Quando** activa a opção "usar despensa"
**Então** os chips de ingredientes são pré-preenchidos com os itens da despensa do utilizador (sem duplicar ingredientes já adicionados manualmente)

**Filtros dietéticos em tempo real**
**Dado que** o utilizador vê a fila de pills de filtro dietético (Vegan, Rápida, Airfryer, etc.)
**Quando** selecciona ou remove um filtro
**Então** os resultados são recalculados imediatamente para respeitar os filtros activos (multi-selecção permitida)

**Resultados de receitas**
**Dado que** o utilizador tem pelo menos um ingrediente seleccionado
**Quando** os resultados carregam (via Edge Function Supabase → Spoonacular)
**Então** vê uma lista/grid de receitas com thumbnail, título, tempo de preparação, calorias e badges dos filtros dietéticos identificados

**Indicador de ingredientes em falta vs. disponíveis**
**Dado que** uma receita nos resultados requer ingredientes que o utilizador não tem na despensa
**Quando** o resultado é apresentado
**Então** mostra visualmente quantos/quais ingredientes já tem (correspondem à despensa ou à selecção actual) vs. quantos faltam

**Guardar em favoritos**
**Dado que** o utilizador vê um resultado de receita
**Quando** toca no botão de guardar em favoritos
**Então** a receita é gravada em `saved_recipes` associada ao seu `user_id`, com feedback visual imediato (ex: ícone preenchido)

**Cache de resultados**
**Dado que** uma pesquisa com a mesma combinação de ingredientes + filtros já foi feita na última hora
**Quando** o mesmo pedido é repetido (pelo mesmo utilizador ou outro)
**Então** a Edge Function serve a resposta do cache Redis em vez de chamar a Spoonacular API novamente, respeitando o limite de 1h dos termos de uso

## Critérios de aceitação
- [ ] Ecrã `app/(tabs)/search.tsx` com input de texto + autocomplete de ingredientes
- [ ] Chips removíveis para ingredientes seleccionados, estilo consistente com `src/constants/theme.ts`
- [ ] Toggle "usar despensa" que lê `pantry_items` do utilizador autenticado e pré-preenche chips sem duplicados
- [ ] Fila de pills de filtros dietéticos (`FiltroDietetico[]`) com multi-selecção, fundo `#2C3B4D` inactivo / `#FFB162` activo
- [ ] Edge Function Supabase que chama a Spoonacular API com `SPOONACULAR_API_KEY` (nunca no cliente) e aplica cache Redis (TTL máximo 1h)
- [ ] Chave de cache Redis determinística a partir da combinação ordenada de ingredientes + filtros activos
- [ ] Cards de resultado com thumbnail, título, tempo de preparação, calorias e badges de filtros identificados
- [ ] Indicador visual (ex: "3/5 ingredientes disponíveis") por resultado, comparando ingredientes da receita com despensa/selecção actual
- [ ] Botão de guardar em favoritos por resultado, persistindo em `saved_recipes` com `fonte='spoonacular'`
- [ ] Estado vazio (sem ingredientes seleccionados) e estado de "sem resultados" tratados visualmente
- [ ] Respeito ao limite do plano Grátis, se aplicável (confirmar em research/plan se pesquisa por ingredientes tem limite ou é ilimitada mesmo no plano gratuito)
- [ ] Cores e fontes exclusivamente via tokens de `src/constants/theme.ts`
- [ ] Componentes extraídos para `src/components/recipe/` (ex: `RecipeCard`, `MacroBar`, `FilterRow`) e `src/components/pantry/` onde aplicável, cada um sob 150 linhas
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- Reutilizar/criar `src/hooks/useRecipeSearch.ts` para encapsular chamada à Edge Function, debounce de pesquisa, e estado de ingredientes/filtros seleccionados
- `SPOONACULAR_API_KEY` fica apenas na Edge Function (`supabase/functions/`) — o cliente nunca a vê nem a chama directamente
- Cache Redis (Railway) é obrigatório e tem de respeitar o máximo de 1h imposto pelos termos da Spoonacular; confirmar em `/research` a estratégia exacta de invalidação/chave de cache
- Autocomplete de ingredientes: confirmar em research se usa endpoint próprio da Spoonacular (`ingredients/autocomplete`) — nesse caso também precisa de passar pela Edge Function, ou se usa uma lista local/estática para o MVP
- Comparação "ingredientes em falta vs. disponíveis" depende de mapear os ingredientes devolvidos pela Spoonacular (frequentemente em inglês) com os nomes guardados em `pantry_items` (em português) — este é um risco técnico a resolver em plan/implement (normalização/tradução de nomes)
- Considerar debounce na chamada da API à medida que ingredientes/filtros mudam, para não disparar um pedido por cada alteração
- `saved_recipes.macros` (jsonb) deve ser preenchido a partir dos dados de macros devolvidos pela Spoonacular ao guardar em favoritos

## Fora do escopo
- Barcode scanner e CRUD completo da despensa (isso é F05)
- Planeamento semanal de refeições a partir dos resultados (isso é F07/Premium)
- Lista de compras automática a partir de uma receita (isso é F07)
- Pesquisa por vídeos de YouTube/TikTok/Instagram (coberto pela homepage, F03)
- Ecrã equivalente na app web (`apps/web/`)

## Próximo passo
/research Como estruturar o ecrã de pesquisa por ingredientes (`app/(tabs)/search.tsx`), incluindo o hook `useRecipeSearch`, a Edge Function Supabase que integra com a Spoonacular API com cache Redis (TTL 1h), a estratégia de autocomplete de ingredientes, e a lógica de comparação entre ingredientes da receita e os itens de `pantry_items` do utilizador para o indicador de "em falta vs. disponíveis"?
