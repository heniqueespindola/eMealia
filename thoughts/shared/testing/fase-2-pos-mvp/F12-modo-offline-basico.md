# F12 — Modo offline básico

Fonte: `thoughts/shared/plans/2026-07-30-modo-offline-basico.md`

## Pré-requisitos
- [ ] Colunas `updated_at` em `pantry_items`/`saved_recipes` + triggers `set_updated_at` aplicados
- [ ] `@react-native-community/netinfo` instalado
- [ ] Simulador/dispositivo com modo avião facilmente acessível
- [ ] Nota: no simulador iOS, mudanças de rede em background não disparam o evento do NetInfo — forçar `NetInfo.refresh()` ao voltar ao foreground se o banner não actualizar sozinho

## Testes automáticos / de código
- [ ] `tsc --noEmit` passa em `packages/types`, `packages/supabase`, `apps/mobile`
- [ ] `grep -r "expo-sqlite" packages/supabase/src` devolve vazio (regra de arquitectura: `packages/supabase` não pode depender de `expo-sqlite`, é partilhado com a app web)
- [ ] Correr o `ALTER TABLE`/trigger `set_updated_at` manualmente e confirmar que `updated_at` muda ao fazer um `UPDATE` de teste em `pantry_items`

## Testes manuais — banner de rede
1. [ ] Activar modo avião → banner "Modo offline — algumas funcionalidades podem não estar disponíveis" aparece em qualquer ecrã
2. [ ] Desactivar modo avião → banner desaparece automaticamente

## Testes manuais — camada SQLite local
- [ ] Chamar `addOffline` (via um item novo na despensa em modo avião) e confirmar (log/debug) que a linha aparece em `pantry_items_cache` **e** em `outbox`

## Testes manuais — despensa offline (leitura + escrita + fila)
- [ ] Modo avião → abrir Despensa → itens carregados anteriormente continuam visíveis
- [ ] Modo avião → adicionar/editar/remover item → reflectido imediatamente na UI
- [ ] Fechar e reabrir a app ainda em modo avião → alterações persistem
- [ ] Reactivar rede → alterações aparecem no Supabase Dashboard
- [ ] Conflito: alterar o mesmo item no servidor com timestamp mais recente enquanto offline → ao sincronizar, a versão do servidor prevalece (last-write-wins)
- [ ] Com um item pendente no outbox, sair do modo avião → `processOutbox` corre, entrada removida do outbox, item aparece em `pantry_items` no Supabase

## Testes manuais — favoritos offline + cache de receitas vistas
- [ ] Ver ≥21 receitas diferentes via `RecipeDetailModal` (favoritos) com rede activa, depois modo avião → só as últimas 20 permanecem no cache
- [ ] Modo avião → abrir Favoritos → lista completa continua visível a partir do cache
- [ ] Modo avião → tentar guardar uma nova receita (via pesquisa) → operação não é enviada (sem crash, sem erro visível além do banner)

## Testes manuais — mensagens de erro claras (feed/pesquisa)
- [ ] Modo avião → Homepage → mensagem clara em vez de spinner infinito
- [ ] Modo avião → pesquisar por ingredientes → mensagem clara em vez de spinner infinito ou "nenhuma receita encontrada"

## Verificação de dados (Supabase)
```sql
select id, nome, updated_at from pantry_items where user_id = '<id de teste>' order by updated_at desc;
```

## Regressão a vigiar
- `usePantry.ts`, `useSavedRecipes.ts`, `useFeed.ts`, `useRecipeSearch.ts` são todos modificados nesta feature — retestar os fluxos online normais de F04, F05, F06 depois desta feature (regressão de comportamento online, não só offline).
- O limite de 20 itens grátis (F05) continua validado do lado do cliente — confirmar que operações offline não contornam esse limite.
