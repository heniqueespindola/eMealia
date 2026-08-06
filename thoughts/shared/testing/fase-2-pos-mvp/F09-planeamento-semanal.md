# F09 — Planeamento semanal de refeições

Fonte: `thoughts/shared/plans/2026-07-27-planeamento-semanal.md`

## Pré-requisitos
- [x] UNIQUE constraint `meal_plan_slot_unique` aplicada em `supabase/schema.sql`
- [x] Edge Function `recipe-ingredients` actualizada para devolver também `macros` (cache key `v2`)
- [x] Conta Premium (mudar `profiles.plano` manualmente é aceitável) e conta `free` para testar o gate
- [x] Favoritos (F06) com pelo menos uma receita Spoonacular guardada, para o picker "Favoritos"

## Testes automáticos / de código
- [x] `tsc --noEmit` sem erros em todas as fases
- [x] `expo lint` sem warnings
- [x] Confirmar em `pg_constraint` (ou via insert duplicado de teste) que a UNIQUE constraint está activa
- [x] `curl` a `recipe-ingredients` com um `recipeId` válido → resposta inclui `{ ingredientes, macros: { calorias, proteinas, hidratos, gorduras } }`

## Testes manuais — gate Premium e navegação
1. [x] Utilizador `free` abre "Planeamento" → vê `PremiumLock`, sem grelha visível
2. [x] Utilizador Premium → vê cabeçalho + `WeekNavigator`; avançar/recuar semana actualiza o label "Semana de DD/M – DD/M"

## Testes manuais — grelha e slots
- [x] Slots vazios mostram "+ Adicionar"; slots ocupados mostram o título da receita
- [x] Tocar num slot ocupado → entra em modo "mover" (destaque visual); tocar noutro slot → conclui a mudança, persiste em `meal_plan` (reload confirma nova posição)
- [x] Mover para um slot já ocupado → pede confirmação antes de substituir
- [x] Swipe num slot ocupado → revela "trocar" e "remover"; "remover" pede confirmação e elimina o registo
- [x] Depois de várias trocas/movimentos, confirmar em `meal_plan` que não sobra nenhuma linha duplicada por posição

## Testes manuais — adicionar/trocar receita
- [x] Tocar num slot vazio → abre modal na tab Favoritos por default; seleccionar receita preenche o slot
- [x] Trocar para tab Pesquisar, procurar por ingrediente, seleccionar resultado → preenche o slot com `fonte: 'spoonacular'`
- [x] "Trocar" (swipe num slot ocupado) → abre o mesmo modal; nova selecção substitui a receita anterior sem criar novo registo (confirmar só 1 linha em `meal_plan` para essa posição)

## Testes manuais — macros diários
- [x] Dia com receitas Spoonacular guardadas em favoritos → soma correcta de calorias na `DayMacroBar`
- [x] Dia com receita Spoonacular não guardada em favoritos → também mostra macros (via `recipe-ingredients` estendida)
- [x] Dia com receita de vídeo (YouTube/TikTok/Instagram) → badge "parcial", soma só as receitas com macros conhecidos

## Testes manuais — gerar lista de compras da semana
- [x] Semana só com receitas Spoonacular → gera lista normalmente, sem aviso
- [x] Semana com mistura Spoonacular + vídeo → gera lista (só ingredientes Spoonacular) + aviso do nº de receitas de vídeo ignoradas
- [x] Semana vazia → alerta "Ainda não tens receitas planeadas para esta semana", sem chamar `addFromSemana`

## Verificação de dados (Supabase)
```sql
select semana_inicio, dia_semana, momento, titulo, fonte
from meal_plan
where user_id = '<id de teste>'
order by semana_inicio, dia_semana, momento;

-- Confirmar ausência de duplicados por posição
select user_id, semana_inicio, dia_semana, momento, count(*)
from meal_plan
group by 1,2,3,4
having count(*) > 1;
-- Esperado: 0 linhas
```

## Testes de usabilidade (ecrã pequeno)
- [ ] Em iPhone SE / Android compacto, confirmar que as 4 células de momento por dia continuam legíveis (trade-off assinalado na spec)

## Regressão a vigiar
- F10 (Macros) refactoriza `usePlannerMacros.ts` para delegar em `resolverMacrosPorDia` — depois de F10, revalidar que `DayMacroBar` mostra os mesmos totais de antes (regressão zero).
- F07 (`addFromSemana`) é reaproveitado sem alterações — confirmar que o botão "Gerar lista da semana" continua a funcionar depois de qualquer alteração a `useShoppingList`.
