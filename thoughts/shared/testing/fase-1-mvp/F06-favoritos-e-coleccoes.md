# F06 — Favoritos e coleções

Fonte: `thoughts/shared/plans/2026-07-24-favoritos-e-coleccoes.md`

## Pré-requisitos
- [ ] Coluna `saved_recipes.tempo_minutos` aplicada no schema remoto
- [ ] Conta de teste com algumas receitas já guardadas via F04 (pesquisa)
- [ ] Uma conta `free` com 10 receitas guardadas (para o limite) e outra Premium

## Testes automáticos / de código
- [ ] `npx tsc --noEmit` sem erros
- [ ] `expo lint` sem warnings
- [ ] Todos os componentes novos sob 150 linhas

## Testes manuais — navegação e listagem
1. [ ] Tab "Favoritos" aparece entre "Pesquisar" e "Despensa"
2. [ ] Com receitas já guardadas (via F04), lista aparece na coleção "Favoritos" por omissão
3. [ ] Nova receita guardada a partir de agora aparece já com "tempo de preparação" visível (não `null`) — regressão corrigida nesta feature

## Testes manuais — coleções
- [ ] Criar coleção nova (nome livre) → aparece na fila de pills
- [ ] Mover uma receita para a nova coleção via long-press → `ColecaoPickerModal` abre, selecção move a receita
- [ ] Filtrar pela nova coleção → só a(s) receita(s) movida(s) aparece(m)
- [ ] Eliminar a coleção criada (com receitas lá dentro) → confirmação via `Alert`; depois de confirmar, as receitas voltam a aparecer em "Favoritos"
- [ ] Tentar eliminar uma coleção por omissão (ex: "Favoritos") → não deve ser possível (sem long-press de eliminar nessas pills)
- [ ] Reiniciar a app depois de criar uma coleção **vazia** (sem mover nenhuma receita) → a coleção desaparece (limitação conhecida e aceite, não é bug)

## Testes manuais — filtros e detalhe
- [ ] Aplicar filtro dietético + filtro de fonte em conjunto → lista reduz correctamente (interseção, não união)
- [ ] Abrir detalhe de uma receita (tocar no card) → mostra macros completos (calorias/proteínas/hidratos/gorduras)
- [ ] Tocar "Abrir receita original" → abre o browser/app externo via `Linking.openURL`
- [ ] Receita sem `source_url` → botão fica desactivado, sem crash

## Testes manuais — limite de plano
- [ ] Plano `free` com 10 receitas guardadas: tentar guardar uma 11ª (a partir da Pesquisa, F04) → não regista, mensagem de limite aparece
- [ ] Plano Premium: guardar mais de 10 sem bloqueio

## Verificação de dados (Supabase)
```sql
select recipe_id, titulo, fonte, colecao, tempo_minutos
from saved_recipes
where user_id = '<id de teste>'
order by colecao, created_at desc;
```

## Regressão a vigiar
- `SourceBadge.tsx` foi estendido de `VideoSource` para `RecipeSource` — confirmar que o feed de vídeos (F03, `VideoCard.tsx`) continua a renderizar badges de fonte correctamente após esta alteração de tipo.
- F07 (Lista de compras) adiciona botão "adicionar à lista" ao `RecipeDetailModal` — retestar o detalhe de receita depois de F07.
