# F10 — Contagem de macros avançada

Fonte: `thoughts/shared/plans/2026-07-28-macros-avancadas.md`

## Pré-requisitos
- [x] Tabela `macro_daily_totals` e colunas de objectivo em `profiles` aplicadas no schema remoto
- [x] F09 (Planeamento semanal) funcional — macros dependem de `meal_plan`
- [x] Conta Premium com receitas planeadas para hoje

## Testes automáticos / de código
- [x] `tsc --noEmit` sem erros em `packages/types`, `packages/supabase`, `apps/mobile`
- [x] SQL de `schema.sql` corre 2x seguidas sem erro (idempotência)
- [x] `SELECT * FROM profiles LIMIT 1;` mostra as novas colunas com `NULL`
- [x] Tabela `macro_daily_totals` tem RLS activo — `SELECT * FROM macro_daily_totals` como outro utilizador devolve vazio
- [x] **Candidato a teste unitário**: `calcularObjectivosDiarios` — casos para os 3 objectivos × 5 níveis de actividade, sexo masculino/feminino, contra valores calculados à mão (fórmula Mifflin-St Jeor)
  - Caso de referência do plano: peso=70, altura=175, idade=30, sexo=masculino, actividade=moderado, objectivo=manutenção → `meta_calorias` ≈ 2555 kcal, `meta_proteinas` = 140g
- [x] **Candidato a teste unitário**: `resolverMacrosPorDia` — caso "dia sem receitas → não aparece no resultado"

## Testes manuais — formulário de objectivos
1. [x] Preencher peso/altura/idade/sexo/actividade/objectivo → guardar → confirma valores calculados batem certo com o caso de referência acima
2. [x] Reabrir o formulário → mostra os valores já guardados (edição, não recriação)

## Testes manuais — sincronização de histórico (F09 → macro_daily_totals)
- [x] Adicionar uma receita ao plano semanal → `macro_daily_totals` para o dia correspondente é actualizado
- [x] Remover essa receita → a linha correspondente passa a `calorias = 0`, `parcial = false` (não fica com valor antigo)

## Testes manuais — dashboard "Hoje"
- [x] Utilizador `free`: botão "Ver objectivos e progresso" em Perfil navega para `/macros`, que mostra `PremiumLock`
- [x] Premium sem objectivos definidos: vista "hoje" mostra CTA para definir objectivos
- [x] Premium com objectivos e receitas planeadas hoje: barras de progresso reflectem o total correcto; estado "excedido" quando total > meta

## Testes manuais — histórico
- [x] Vista "histórico" em modo "Semana" → mostra os 7 dias da semana em vista com totais persistidos
- [x] Alternar para "Mês" → mostra todos os dias do mês com dados + média do período
- [x] Navegar para semana/mês anterior sem dados → lista vazia sem erro

## Testes manuais — alerta de desvio calórico
- [x] `meta_calorias` definida + ≥4 dos últimos 7 dias em `macro_daily_totals` acima da meta → alerta visível em `/macros` e na homepage
- [x] <4 dias excedidos → nenhum alerta
- [x] Utilizador `free` nunca vê o alerta (mesmo com dados históricos de quando era Premium)

## Verificação de dados (Supabase)
```sql
select data, calorias, proteinas, hidratos, gorduras, parcial
from macro_daily_totals
where user_id = '<id de teste>'
order by data desc limit 14;
```

## Regressão a vigiar
- Confirmar que o refactor de `usePlannerMacros.ts` (delegando em `resolverMacrosPorDia`) não altera o comportamento visível em F09 — repetir o teste "macros diários" de F09 depois desta feature.
