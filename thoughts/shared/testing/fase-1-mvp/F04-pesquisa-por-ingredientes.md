# F04 — Pesquisa por ingredientes

Fonte: `thoughts/shared/plans/2026-07-23-pesquisa-por-ingredientes.md`

## Pré-requisitos
- [x] Secrets configurados no Supabase: `SPOONACULAR_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- [x] Edge Functions `search-recipes` e `autocomplete-ingredients` deployadas (`supabase functions deploy search-recipes autocomplete-ingredients`)
- [x] Conta de teste com alguns itens em `pantry_items` (para testar "usar despensa")

## Testes automáticos / de código
- [x] `npx tsc --noEmit` sem erros
- [x] `deno check` das duas Edge Functions se Deno CLI disponível localmente
- [x] `curl` directo à função `search-recipes` com `{ "ingredients": ["egg", "tomato"] }` → confirma `results` com `tempo_minutos`, `macros`, `filtros` preenchidos
- [x] Repetir a mesma chamada dentro de 1h → resposta idêntica servida por cache (latência visivelmente menor / sem nova chamada à Spoonacular nos logs)
- [x] `curl` à função `autocomplete-ingredients` com `{ "query": "egg" }` → `suggestions` não vazio

## Testes manuais — fluxo feliz
1. [x] Abrir separador "Pesquisa" → mostra input + estado vazio ("Adiciona pelo menos um ingrediente...")
2. [x] Escrever 2+ caracteres → sugestões de autocomplete aparecem; tocar numa sugestão → vira chip, input limpa
3. [x] Escrever um ingrediente e premir "done"/enter → também vira chip
4. [x] Tocar no × de um chip → remove-o, resultados recalculam (após debounce de 500ms)
5. [x] Activar "Usar despensa" (com itens em `pantry_items`) → pré-preenche chips sem duplicar os já existentes
6. [x] Seleccionar/desseleccionar pills de filtro dietético → resultados recalculam
7. [x] Com ≥1 ingrediente, resultados aparecem com thumbnail, título, tempo, calorias, indicador "X/Y disponíveis" e badges de filtros
8. [x] Tocar no coração de uma receita → guarda em `saved_recipes` (coração fica preenchido); tocar de novo → remove
9. [x] Repetir a mesma pesquisa pouco depois → visivelmente mais rápida (cache Redis)

## Testes manuais — casos de erro e limites
- [x] Combinação ingredientes+filtros sem correspondência → "Nenhuma receita encontrada com estes ingredientes/filtros."
- [x] Ingredientes escritos livremente em português (não escolhidos do autocomplete) → confirmar qualidade dos resultados (risco conhecido e aceite — documentar se a correspondência for fraca, não é bug a corrigir aqui)
- [x] Adicionar o mesmo ingrediente duas vezes (case-insensitive, ex: "Ovo" depois "ovo") → não duplica o chip

## Verificação de dados (Supabase)
```sql
select recipe_id, titulo, fonte, macros, filtros, colecao
from saved_recipes
where user_id = '<id de teste>'
order by created_at desc limit 5;
```

## Regressão a vigiar
- F05 (Despensa) introduz a integração "cozinhar agora" que reaproveita exactamente o mecanismo "Usar despensa" desta feature — depois de F05 implementado, retestar o passo 5 acima a partir do botão "Cozinhar agora" da Despensa.
- F06 (Favoritos) adiciona um gate de limite de 10 receitas guardadas (plano Grátis) ao mesmo botão de coração usado aqui — retestar o passo 8 depois de F06.
- F07 (Lista de compras) adiciona um botão "adicionar à lista" ao `RecipeCard` — confirmar que não quebra o layout/toggle de favoritos existente.
