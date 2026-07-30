---
data: 2026-07-30
status: backlog
prioridade: media
fase_mvp: nao
---

# Feature: Modo Offline Básico

## Contexto
Hoje toda a app depende de ligação activa: `usePantry`, `useSavedRecipes` (favoritos) e o feed de vídeos vão sempre à rede (Supabase/Spoonacular/YouTube) e falham silenciosamente ou ficam presos em `loading` sem rede. Para o utilizador real da eMealia — muitas vezes na cozinha, com rede instável ou dados limitados — isto quebra o caso de uso central ("o que tenho, o que posso cozinhar agora"). Esta feature garante que despensa, favoritos e as últimas receitas vistas continuam acessíveis e editáveis sem ligação, com sincronização automática ao reconectar.

## Comportamento esperado

**Ver receitas recentes offline**
**Dado que** o utilizador visualizou receitas enquanto tinha ligação
**Quando** perde a ligação e abre uma dessas receitas (últimas 20 visualizadas)
**Então** vê o conteúdo cached localmente (título, thumbnail, macros, ingredientes) em vez de erro ou ecrã em branco

**Editar despensa offline**
**Dado que** o utilizador está sem ligação
**Quando** adiciona, edita ou remove um item da despensa
**Então** a alteração é reflectida imediatamente na UI local e fica registada numa fila de operações pendentes

**Sincronizar despensa ao reconectar**
**Dado que** existem operações pendentes na fila (adicionar/editar/remover item de despensa)
**Quando** a ligação é restabelecida
**Então** as operações são reenviadas ao Supabase pela ordem em que ocorreram, e em caso de conflito (o mesmo item alterado no servidor entretanto) prevalece a alteração com o `updated_at` mais recente (last-write-wins)

**Ver favoritos offline**
**Dado que** o utilizador tem receitas guardadas em `saved_recipes`
**Quando** abre a lista de favoritos sem ligação
**Então** vê a lista completa a partir dos dados cached localmente (sem possibilidade de adicionar novos favoritos offline nesta fase)

**Aviso de modo offline**
**Dado que** o dispositivo perde ligação à internet (detectado via NetInfo)
**Quando** o estado de rede muda para offline
**Então** aparece um banner "Modo offline — algumas funcionalidades podem não estar disponíveis" persistente até a ligação voltar, e desaparece automaticamente ao reconectar

**Falha a meio de operação**
**Dado que** o utilizador perde ligação a meio de uma acção que precisa de rede (ex: pesquisa Spoonacular, feed de vídeos)
**Quando** a operação falha por falta de rede
**Então** a UI mostra um estado vazio/erro claro distinto de "sem resultados", em vez de spinner infinito

## Critérios de aceitação
- [ ] Cache local das últimas 20 receitas visualizadas (Spoonacular e/ou vídeo) persistida via `expo-sqlite` ou `AsyncStorage`, com eviction FIFO acima de 20
- [ ] Despensa (`usePantry`/`pantryStore`) funcional offline: leitura do cache local, escrita optimista local mesmo sem rede
- [ ] Fila de operações pendentes (`add`/`update`/`remove` de pantry_items) persistida localmente, sobrevive a fechar a app
- [ ] Ao reconectar, fila é processada em ordem e limpa após sucesso; falhas individuais não bloqueiam o resto da fila
- [ ] Conflict resolution last-write-wins implementado e testável (comparação de timestamps)
- [ ] Favoritos (`saved_recipes`) disponíveis para leitura offline a partir de dados cached
- [ ] Hook/serviço de estado de rede (`useNetworkStatus` ou equivalente) baseado em NetInfo, partilhado por toda a app
- [ ] Banner de aviso offline visível em qualquer ecrã enquanto sem ligação, usando tokens de cor de `theme.ts`
- [ ] `tsc --noEmit` sem erros

## Notas técnicas
- **Falta coluna `updated_at` em `pantry_items`** (`supabase/schema.sql:44-52`) — a tabela só tem `created_at`. Last-write-wins exige comparar timestamp da alteração local vs. servidor; sem `updated_at` não há como o servidor saber quando um registo foi alterado pela última vez. Provavelmente é preciso `ALTER TABLE pantry_items ADD COLUMN updated_at timestamptz DEFAULT now()` + trigger `BEFORE UPDATE` para o manter actual — a confirmar em research.
- **`@react-native-community/netinfo` não está instalado** — precisa de ser adicionado às dependências (`npm install`, não `expo install`, por causa do `legacy-peer-deps`).
- **`expo-sqlite` e `@react-native-async-storage/async-storage` já estão instalados** (`apps/mobile/package.json`) mas não têm nenhum uso actual no código — esta é a primeira feature a introduzir persistência local real. A confirmar em research qual dos dois faz mais sentido para cada caso: SQLite para queries/filtragem de receitas cached, AsyncStorage para a fila de operações pendentes (mais simples, volume baixo).
- **Stores Zustand actuais (`pantryStore.ts`, `savedRecipesStore.ts`) não têm persistência** — hoje vivem só em memória e são repovoados a partir do Supabase em cada sessão (ver `usePantry.ts:13-20`, que só faz fetch se `loadedUserId` mudar). Introduzir cache local implica decidir se a persistência entra na própria store Zustand (ex: `zustand/middleware persist` com adapter para AsyncStorage/SQLite) ou numa camada `packages/supabase`/`lib/offline` separada que os hooks consultam antes/depois da rede.
- **Fila de sincronização é lógica de negócio partilhável** — segundo a regra do monorepo ("lógica de negócio e queries → `packages/`"), a fila de operações pendentes e o merge last-write-wins devem provavelmente viver em `packages/supabase` ou um novo `packages/offline`, não directamente em `apps/mobile`, para poderem ser reutilizados pela app web no futuro (ainda que o `apps/web` fique fora do escopo desta feature).
- Reutilizar `usePantry.ts` (`apps/mobile/src/hooks/usePantry.ts`) e `pantryStore.ts` como ponto de integração — a fila de pendentes intercepta `add`/`update`/`remove` quando offline em vez de chamar `@emealia/supabase` directamente.
- Feed de vídeos (F03) e pesquisa por ingredientes (F04) **não** fazem parte do cache offline desta feature (ver Fora do escopo) — apenas precisam de um estado de erro claro quando falham por falta de rede.

## Fora do escopo
- Cache offline do feed de vídeos da homepage (F03) e da pesquisa por ingredientes (F04) — continuam a exigir rede, apenas com melhor tratamento de erro
- Adicionar novos favoritos enquanto offline (favoritos são só-leitura offline nesta fase)
- Planeamento semanal (F07/planner) e lista de compras offline
- Sincronização de conflitos mais sofisticada que last-write-wins (ex: merge de campos, resolução manual pelo utilizador)
- Modo offline na app web (`apps/web/`)
- Download explícito/manual de receitas para offline pelo utilizador (esta feature é cache automático das últimas vistas, não uma lista "guardar para offline")

## Próximo passo
/research Como adicionar `updated_at` a `pantry_items` com trigger de actualização automática para suportar last-write-wins, se `expo-sqlite` ou `AsyncStorage` é mais adequado para cache de receitas vs. fila de operações pendentes, como integrar persistência local nas stores Zustand existentes (`pantryStore.ts`, `savedRecipesStore.ts`) sem duplicar lógica de fetch em `usePantry.ts`/`useSavedRecipes`, e onde deve viver a lógica de fila/sync partilhável (`packages/supabase` vs. novo `packages/offline`) tendo em conta a regra do monorepo de lógica de negócio em `packages/`.
