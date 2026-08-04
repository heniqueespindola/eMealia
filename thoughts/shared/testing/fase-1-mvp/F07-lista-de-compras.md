# F07 — Lista de compras automática

Fonte: `thoughts/shared/plans/2026-07-24-lista-de-compras.md`

## Pré-requisitos
- [ ] Edge Function `recipe-ingredients` deployada, com `SPOONACULAR_API_KEY`/Redis configurados
- [ ] Fases 1-5 do plano são testáveis em Expo Go; **Fase 6 (exportação nativa) exige dev client** (`eas build --profile development`) — `expo-calendar`/`google-signin` não funcionam em Expo Go
- [ ] Conta de teste com itens na despensa e pelo menos uma receita Spoonacular disponível na pesquisa

## Testes automáticos / de código
- [ ] `npx tsc --noEmit` sem erros
- [ ] `npm run lint` sem warnings
- [ ] Todos os componentes novos sob 150 linhas
- [ ] **Candidatos a teste unitário puro** (sem I/O, fáceis de isolar): `normalizarNome` (acentos, plural simples, maiúsculas), `consolidarIngredientes` (dedup mantendo primeira ocorrência), `agruparPorComprado` (secções vazias filtradas)
- [ ] `curl` a `recipe-ingredients` com `recipeId` Spoonacular válido → `ingredientes` com `nome`/`quantidade` preenchidos
- [ ] `curl` com `recipeId` não numérico → `400` com mensagem clara
- [ ] Repetir a mesma chamada dentro de 1h → servida por cache Redis

## Testes manuais — CRUD manual
1. [ ] Na Despensa, tocar "Lista de compras" → abre modal com lista vazia (utilizador novo)
2. [ ] Adicionar item manual (com autocomplete) → aparece em "Por comprar"
3. [ ] Marcar/desmarcar checkbox → move o item entre secções "Por comprar"/"Comprados", com texto riscado quando comprado
4. [ ] Eliminar item individual → remove da lista
5. [ ] "Limpar lista" → pede confirmação (`Alert`), depois esvazia

## Testes manuais — geração automática
- [ ] Na pesquisa por ingredientes (F04), tocar "adicionar à lista" numa receita Spoonacular → insere só os ingredientes que **não** estão na despensa
- [ ] Repetir a mesma acção duas vezes → não duplica itens (idempotência)
- [ ] Em Favoritos (F06), receita Spoonacular mostra botão "adicionar à lista" activo; receita YouTube/TikTok/Instagram mostra o botão desactivado com texto explicativo
- [ ] No Planner (stub nesta fase, F09 ainda não implementado): botão "Gerar lista da semana" com `meal_plan` vazio → alerta "Ainda não tens receitas planeadas para esta semana"

## Testes manuais — partilha e exportação
- [ ] "Partilhar" → abre a share sheet nativa com a lista formatada em texto
- [ ] Plano `free`: tentar exportar → mensagem de upgrade, sem executar a exportação
- [ ] ⚠️ Requer dev client — Plano Premium, iOS: exportar pede permissão de Lembretes na primeira vez, depois cria um lembrete por item não comprado
- [ ] ⚠️ Requer dev client — Plano Premium, Android: exportar pede login Google (scope Tasks), depois cria uma task por item não comprado
- [ ] ⚠️ Negar a permissão/login → mensagem de erro sem crash

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
