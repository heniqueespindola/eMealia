# F07 — Lista de compras automática

Fonte: `thoughts/shared/plans/2026-07-24-lista-de-compras.md`

## Pré-requisitos
- [x] Edge Function `recipe-ingredients` deployada, com `SPOONACULAR_API_KEY`/Redis configurados
- [x] Fases 1-5 do plano são testáveis em Expo Go; **Fase 6 (exportação nativa) exige dev client** (`eas build --profile development`) — `expo-calendar`/`google-signin` não funcionam em Expo Go
- [ ] Conta de teste com itens na despensa e pelo menos uma receita Spoonacular disponível na pesquisa

## Testes automáticos / de código
- [x] `npx tsc --noEmit` sem erros
- [x] `npm run lint` sem warnings
- [x] Todos os componentes novos sob 150 linhas
- [x] **Candidatos a teste unitário puro** (sem I/O, fáceis de isolar): `normalizarNome` (acentos, plural simples, maiúsculas), `consolidarIngredientes` (dedup mantendo primeira ocorrência), `agruparPorComprado` (secções vazias filtradas)
- [x] `curl` a `recipe-ingredients` com `recipeId` Spoonacular válido → `ingredientes` com `nome`/`quantidade` preenchidos
- [x] `curl` com `recipeId` não numérico → `400` com mensagem clara
- [x] Repetir a mesma chamada dentro de 1h → servida por cache Redis

## Testes manuais — CRUD manual
1. [x] Na Despensa, tocar "Lista de compras" → abre modal com lista vazia (utilizador novo)
2. [x] Adicionar item manual (com autocomplete) → aparece em "Por comprar"
3. [x] Marcar/desmarcar checkbox → move o item entre secções "Por comprar"/"Comprados", com texto riscado quando comprado
4. [x] Eliminar item individual → remove da lista
5. [x] "Limpar lista" → pede confirmação (`Alert`), depois esvazia

## Testes manuais — geração automática
- [x] Na pesquisa por ingredientes (F04), tocar "adicionar à lista" numa receita Spoonacular → insere só os ingredientes que **não** estão na despensa
- [x] Repetir a mesma acção duas vezes → não duplica itens (idempotência)
- [x] Em Favoritos (F06), receita Spoonacular mostra botão "adicionar à lista" activo; receita YouTube/TikTok/Instagram mostra o botão desactivado com texto explicativo
- [x] No Planner (stub nesta fase, F09 ainda não implementado): botão "Gerar lista da semana" com `meal_plan` vazio → alerta "Ainda não tens receitas planeadas para esta semana"

## Testes manuais — partilha e exportação
- [x] "Partilhar" → abre a share sheet nativa com a lista formatada em texto
- [x] Plano `free`: tentar exportar → mensagem de upgrade, sem executar a exportação
- [x] ⚠️ Requer dev client — Plano Premium, iOS: exportar pede permissão de Lembretes na primeira vez, depois cria um lembrete por item não comprado
- [x] ⚠️ Requer dev client — Plano Premium, Android: exportar pede login Google (scope Tasks), depois cria uma task por item não comprado
- [x] ⚠️ Negar a permissão/login → mensagem de erro sem crash

## Verificação de dados (Supabase)
```sql
select nome, quantidade, comprado, recipe_id
from shopping_list
where user_id = '<id de teste>'
order by created_at desc;
```

## Regressão a vigiar
- `RecipeCard.tsx` (F04) e `RecipeDetailModal.tsx` (F06) ganham um novo botão/prop nesta feature — confirmar que os testes de F04/F06 relacionados com esses componentes continuam a passar.
- F08 (Planos) substitui o aviso de limite/upgrade do `ShoppingListModal` por `PremiumLock` — retestar depois de F08.
- F09 (Planeamento) liga "gerar lista da semana" a dados reais do planner — o teste "Planner vazio" acima deve ser revalidado end-to-end depois de F09.
