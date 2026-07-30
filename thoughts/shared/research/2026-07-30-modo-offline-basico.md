---
data: 2026-07-30
feature: "Modo Offline Básico"
status: completo
---

# Research: Modo Offline Básico

## Questão de Pesquisa
Como implementar modo offline básico na eMealia: (1) cache local das últimas 20 receitas visualizadas, (2) despensa editável offline com sync last-write-wins ao reconectar, (3) favoritos disponíveis offline, (4) banner de aviso via NetInfo quando sem ligação, (5) fila de operações pendentes de despensa sincronizada ao reconectar. Ver ticket `thoughts/shared/tickets/2026-07-30-modo-offline-basico.md`.

## Sumário
Não existe hoje **nenhuma** infra de offline/rede/sync no repositório — nem `NetInfo`, nem uso real de `expo-sqlite`/`AsyncStorage` para dados de domínio, nem conceito de "operação pendente" em nenhum store. Os stores Zustand (`pantryStore`, `savedRecipesStore`, etc.) e os hooks correspondentes (`usePantry`, `useSavedRecipes`) seguem todos o mesmo padrão simples e síncrono com o Supabase, sem persistência local, sem tratamento de erro propagado à UI, e sem retry. Falta também a coluna `updated_at` em `pantry_items`, necessária para last-write-wins. Tudo o resto (bibliotecas, APIs, padrões de outbox) tem de ser introduzido de raiz, mas todas as dependências necessárias (`expo-sqlite`, `@react-native-async-storage/async-storage`) já estão instaladas — falta apenas `@react-native-community/netinfo`.

## Ficheiros Relevantes da Codebase

### Stores (Zustand, sem middleware/persistência)
- `apps/mobile/src/stores/pantryStore.ts:1-27` — `PantryState { items, loading, loadedUserId, setItems, setLoading, addItem, updateItem, removeItem, reset }`. Padrão-base a replicar/estender para offline.
- `apps/mobile/src/stores/savedRecipesStore.ts:1-33` — igual ao padrão base + `customColecoes`, `addCustomColecao`, `removeCustomColecao`.
- `apps/mobile/src/stores/shoppingListStore.ts:1-31` — igual ao padrão base + `addItems` (bulk), `clear()`.
- `apps/mobile/src/stores/followedCreatorsStore.ts:1-30` — guarda `items` e `creators` em paralelo.
- `apps/mobile/src/stores/profileStore.ts:1-17`, `authStore.ts:1-23`, `plannerStore.ts`, `onboardingStore.ts` — outros stores, sem relevância directa para esta feature.

Nenhum store tem `persist` middleware, nenhum tem conceito de "dirty"/"pending"/"synced".

### Hooks de dados
- `apps/mobile/src/hooks/usePantry.ts:1-53` — fetch-if-not-loaded + add/update/remove síncronos com Supabase; erro só faz `console.error`, não propaga para a UI.
- `apps/mobile/src/hooks/useSavedRecipes.ts:1-70` — hook de **favoritos** (não se chama `useFavorites`); mesmo padrão, mais `moveToColecao`/`createColecao`/`deleteColecao`.
- `apps/mobile/src/hooks/useShoppingList.ts:1-107` — mesmo padrão + lógica de dedupe/consolidação.
- `apps/mobile/src/hooks/useFeed.ts:1-59` — **excepção ao padrão**: usa `useState` local (não Zustand), faz query directa a `supabase.from('video_cache')`, tem fallback para `MOCK_VIDEOS`, e é o único hook que expõe `error: string | null` à UI. Fora do escopo desta feature (feed não é cacheado offline), mas é a única referência existente no repo de tratamento de erro visível ao utilizador.
- `apps/mobile/src/hooks/useRecipeSearch.ts:1-61` — pesquisa Spoonacular via edge function `search-recipes`; debounce de 500ms; `error` também exposto. Fora do escopo (sem cache offline), mas precisa de um estado de erro claro quando falha por falta de rede (ver ticket).

### Camada de dados (`packages/supabase`)
- `packages/supabase/src/index.ts:1-8` — barrel que reexporta `src/queries/*`.
- `packages/supabase/src/queries/pantry.ts:1-33`:
  ```ts
  getPantry(client, userId)       // select * where user_id, order created_at desc
  addPantryItem(client, item)     // insert().select().single()
  updatePantryItem(client, id, updates: Partial<PantryItem>) // update().eq(id).select().single()
  deletePantryItem(client, id)    // delete().eq(id)
  addPantryItems(client, items)   // insert bulk .select()
  ```
- `packages/supabase/src/queries/recipes.ts:1-50` — funções de favoritos (`saved_recipes`):
  ```ts
  getSavedRecipes(client, userId, colecao?)
  saveRecipe(client, recipe)
  unsaveRecipe(client, id)
  updateSavedRecipe(client, id, updates: Partial<SavedRecipe>)
  reassignColecao(client, userId, deColecao, paraColecao)
  ```
  Todas devolvem directamente `{ data, error }` do supabase-js, sem wrapper de erro/retry.
- Outros ficheiros de queries (mesmo padrão): `feed.ts`, `profile.ts`, `shopping_list.ts`, `meal_plan.ts`, `macro_daily_totals.ts`, `creators.ts`.

### Tipos (`packages/types`)
- `packages/types/src/pantry.ts:1-23` — `CategoriaDespensa`, `PantryItem { id, user_id, nome, quantidade, barcode, categoria, expira_em, created_at }` (**sem `updated_at`**), `ShoppingListItem`.
- `packages/types/src/recipe.ts:43-56` — `SavedRecipe { id, user_id, recipe_id, titulo, fonte, thumbnail_url, source_url, macros, tempo_minutos, filtros, colecao, created_at }` (**sem `updated_at`**); linhas 25-36: `RecipeSearchResult { id, titulo, thumbnail_url, source_url, tempo_minutos, macros, filtros, ingredientes_usados, ingredientes_em_falta, total_ingredientes }` (resultado de pesquisa Spoonacular, distinto de `SavedRecipe`).
- `packages/types/src/database.ts:1-60+` — `Database` Postgrest-style com `Tables.pantry_items`/`Tables.saved_recipes` (Row/Insert/Update).
- `packages/types/src/index.ts:1-9` — barrel (`recipe`, `feed`, `pantry`, `user`, `planner`, `macros`, `database`, `creator`).

### Ecrãs relevantes
- `apps/mobile/app/(tabs)/pantry.tsx:1-140` — ecrã Despensa. Usa `usePantry(user?.id)` (linha 21), `SectionList` por categoria, `PantryItemCard`, `PantryItemForm`, `ShoppingListModal`. Já existe um banner condicional (`PremiumLock`, linhas 86-90) logo abaixo do header — precedente directo de onde encaixar um banner de offline.
- `apps/mobile/app/(tabs)/favoritos.tsx:1-159` — ecrã Favoritos. Usa `useSavedRecipes(user?.id)` (linha 22) + `RecipeDetailModal` (linha 149) para abrir o detalhe de uma receita guardada.
- `apps/mobile/app/(tabs)/search.tsx` — ecrã de pesquisa por ingredientes. Usa `useRecipeSearch`, mostra `RecipeCard` por resultado (`RecipeSearchResult`) com toggle-save/add-to-list inline — **não abre nenhum "detalhe de receita"** ao tocar num card de resultado de pesquisa (só em favoritos é que há `RecipeDetailModal`).
- `apps/mobile/src/components/recipe/RecipeDetailModal.tsx:1-117` — modal de detalhe, recebe `recipe: SavedRecipe | null`. É o único componente de "visualização de receita" existente, e só é invocado a partir de favoritos.
- `apps/mobile/app/_layout.tsx:1-43` — root layout Expo Router (`GestureHandlerRootView` > `Stack`), com gate de `authReady` via `useAuth`/`useProfile`. Candidato natural para montar um banner de offline global acima do `Stack`.
- `apps/mobile/src/lib/supabase.ts:1-29` — cliente Supabase; usa `AsyncStorage` só como `auth.storage` (persistência de sessão/token), não para dados de domínio. Comentário nas linhas 8-15 explica a escolha (limite de 2048 bytes do SecureStore/Keychain para o token).

### Config partilhada
- `packages/config/src/index.ts:1-91` — `colors`, `PLANS`, `LIMITS` (`free.pantry_items = 20`, `free.saved_recipes = 10`, `free.daily_feed = 5`), `FILTROS_DIETETICOS`, `DEFAULT_COLECOES`, `FONTES_FAVORITOS`.
- `packages/config/src/macros.ts:1-54` — fórmulas de macros, sem relevância directa.

## Padrões de Implementação Existentes

Padrão comum a todos os hooks de dados (fetch-if-not-loaded + mutação optimista pós-sucesso):

```ts
// apps/mobile/src/hooks/usePantry.ts
export function usePantry(userId: string | undefined) {
  const items   = usePantryStore((s) => s.items);
  const loading = usePantryStore((s) => s.loading);

  useEffect(() => {
    if (!userId) { usePantryStore.getState().reset(); return; }
    if (usePantryStore.getState().loadedUserId === userId) return;
    fetchItems(userId);
  }, [userId]);

  async function fetchItems(uid: string) {
    usePantryStore.getState().setLoading(true);
    const { data, error } = await getPantry(supabase!, uid);
    if (error) console.error('[usePantry] getPantry falhou:', error);
    usePantryStore.getState().setItems(uid, data ?? []);
  }

  async function add(item) {
    if (!userId) return;
    const { data, error } = await addPantryItem(supabase!, { ...item, user_id: userId });
    if (error) { console.error('[usePantry] addPantryItem falhou:', error); return; }
    if (data) usePantryStore.getState().addItem(data);
  }
  // update/remove seguem o mesmo padrão
}
```

Este é o ponto de integração natural para a fila offline: `add`/`update`/`remove` teriam de decidir, quando offline, gravar localmente + enfileirar em vez de chamar `@emealia/supabase` directamente.

Precedente de banner condicional já existente no ecrã de despensa:
```tsx
// apps/mobile/app/(tabs)/pantry.tsx:86-90 (aprox.)
{limitReached && <PremiumLock mensagem="..." />}
```

## Tabelas/Queries Supabase Relevantes

`supabase/schema.sql`:
```sql
-- pantry_items (linhas 44-64) — SEM updated_at
CREATE TABLE IF NOT EXISTS pantry_items (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  nome        text        NOT NULL,
  quantidade  text,
  barcode     text,
  expira_em   date,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pantry: só o próprio" ON pantry_items FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS pantry_items_user_id_idx ON pantry_items(user_id);
ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS categoria text NOT NULL DEFAULT 'outros'
  CHECK (categoria IN ('frescos','secos','congelados','outros'));

-- saved_recipes (linhas 67-90) — SEM updated_at
CREATE TABLE IF NOT EXISTS saved_recipes (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid        REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  recipe_id     text        NOT NULL,
  titulo        text        NOT NULL,
  fonte         text        NOT NULL,
  thumbnail_url text,
  source_url    text,
  macros        jsonb,
  filtros       text[]      DEFAULT '{}',
  colecao       text        DEFAULT 'favoritos',
  created_at    timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "saved_recipes: só o próprio" ON saved_recipes FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS saved_recipes_user_id_idx ON saved_recipes(user_id);
ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS tempo_minutos int;
```

**Sem `supabase/migrations/`** — o schema é aplicado manualmente colando `supabase/schema.sql` no SQL Editor do Supabase Dashboard (`README.md:168-174`). Qualquer alteração de schema para esta feature (ex: adicionar `updated_at`) segue o mesmo padrão idempotente (`ADD COLUMN IF NOT EXISTS`) directamente em `schema.sql`, sem sistema de migrations formal.

## APIs Externas Relevantes

### @react-native-community/netinfo (v11.4.1 bundled no SDK 53)
- Instalação: `npx expo install @react-native-community/netinfo`.
- **Funciona directamente em Expo Go** — não exige development build nem config plugin para o caso de uso básico (só a leitura de SSID wifi no iOS precisa de entitlement/rebuild, irrelevante aqui).
- API:
  ```ts
  import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
  const netInfo = useNetInfo(); // { type, isConnected, isInternetReachable, details }
  const state = await NetInfo.fetch();
  const unsubscribe = NetInfo.addEventListener(state => { ... });
  ```
- `isConnected` (interface de rede activa) é fiável; `isInternetReachable` (teste real de alcance) começa `null` e tem bug documentado e em aberto de ficar `false` persistentemente após sair do modo avião ([issue #615](https://github.com/react-native-netinfo/react-native-netinfo/issues/615)). Recomendação: gate principal em `isConnected === false`; usar `isInternetReachable` como sinal secundário, não único.
- iOS simulator: mudança de rede em background não dispara evento — forçar `NetInfo.refresh()` ao voltar ao foreground.

### expo-sqlite (~15.2.14, SDK 53)
- API assíncrona (`openDatabaseAsync`, `execAsync`, `runAsync`, `getAllAsync`, `getFirstAsync`, `getEachAsync`, prepared statements via `prepareAsync`/`executeAsync`).
- Transacções: `db.withTransactionAsync(cb)` / `db.withExclusiveTransactionAsync(cb)`; recomendado `PRAGMA journal_mode = WAL`.
- Funciona directamente em Expo Go (só SQLCipher exigiria dev build, não relevante aqui).
- Adequado para cache estruturado/queryable (ex: últimas 20 receitas com eviction por `created_at`, dentro de uma transacção que faz insert + delete do excedente atomicamente).

### @react-native-async-storage/async-storage (2.1.2, SDK 53)
- Já usado no projecto, mas só como `auth.storage` do Supabase (`apps/mobile/src/lib/supabase.ts:2,29`) — nenhum uso para dados de domínio.
- Limite prático: leitura por valor limitada a ~2MB no Android (`CursorWindow`); adequado para dados pequenos não-relacionais (ex: outbox simples serializado como array JSON), não para datasets estruturados/queryable.

### Zustand `persist` middleware
```ts
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

persist(
  (set, get) => ({ ... }),
  { name: 'pantry-storage', storage: createJSONStorage(() => AsyncStorage) }
)
```
- Storage engine custom (ex: SQLite) só precisa implementar `{ getItem, setItem, removeItem }` (interface `StateStorage`), permitindo trocar `AsyncStorage` por um wrapper SQLite.
- Hidratação com storage assíncrono acontece **depois** do primeiro render — usar `hasHydrated()`/`onFinishHydration()` para evitar flicker no arranque, já que nenhum store actual do projecto tem este cuidado hoje (todos assumem estado inicial vazio síncrono).

### Padrão Offline Queue / Outbox com Last-Write-Wins
- Estrutura típica de tabela outbox (SQLite): `id, entity, entity_id, op ('upsert'|'delete'), payload (json), idempotency_key, created_at, attempts, last_error`.
- Fluxo ao reconectar: push do outbox local (dedupe por `idempotency_key` no servidor) → pull de alterações do servidor desde o último cursor → aplicar transaccionalmente; um "SyncManager" único evita sync sobreposto.
- Last-write-wins: comparar `updated_at` local vs. servidor — se local mais recente, o valor do servidor é descartado (a versão local será reenviada); senão aceita-se o valor do servidor. Adequado ao caso da eMealia (edição tipicamente num único dispositivo de cada vez); não cobre edição concorrente multi-dispositivo simultânea (fora do escopo do MVP, conforme o ticket).
- Recomendação da comunidade: outbox em SQLite (não AsyncStorage), inserindo o evento na mesma transacção que a escrita local, para nunca perder uma mutação sem o correspondente registo de sync.

## Code Snippets de Referência

Estrutura de tabela outbox sugerida pelas fontes pesquisadas (para adaptar em research/plan futuro):
```sql
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY NOT NULL,
  entity TEXT NOT NULL,            -- ex: 'pantry_items'
  entity_id TEXT NOT NULL,
  op TEXT NOT NULL,                -- 'upsert' | 'delete'
  payload TEXT NOT NULL,           -- JSON
  idempotency_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);
```

Interface mínima exigida pelo Zustand `persist` para um storage engine custom:
```ts
interface StateStorage {
  getItem: (name: string) => string | null | Promise<string | null>;
  setItem: (name: string, value: string) => void | Promise<void>;
  removeItem: (name: string) => void | Promise<void>;
}
```

## Questões em Aberto

1. **O que conta como "receita visualizada"?** Não existe hoje nenhum evento de "ver detalhe de receita" fora de favoritos — `search.tsx` mostra `RecipeCard` por resultado de pesquisa mas nunca abre `RecipeDetailModal` (esse só é usado a partir de `favoritos.tsx:149`, sobre `SavedRecipe`). É preciso decidir, antes de implementar: "visualizada" = aparecer num resultado de pesquisa? Só quando o utilizador abre um detalhe (que hoje não existe para resultados de pesquisa, só para favoritos)? Ou os vídeos do feed (`VideoItem`) também contam?
2. **Schema**: falta `updated_at` em `pantry_items` e `saved_recipes` (`supabase/schema.sql:44-90`) — necessário para last-write-wins. Precisa de `ALTER TABLE ... ADD COLUMN updated_at timestamptz DEFAULT now()` + trigger `BEFORE UPDATE` (não existe nenhum trigger no schema actual, seria o primeiro).
3. **SQLite vs AsyncStorage para cada peça**: research externo aponta SQLite para cache de receitas (queryable, eviction transaccional) e outbox (transaccional junto com a escrita local); AsyncStorage é mais simples mas com garantias mais fracas. A decidir em `/plan`.
4. **Onde vive a lógica partilhável**: regra do monorepo diz "lógica de negócio e queries → `packages/`". A decidir se o outbox/sync fica em `packages/supabase` (junto às queries existentes) ou um novo `packages/offline`, e se isso é relevante já que o `apps/web` está fora do escopo desta feature.
5. **Hidratação da store**: nenhum store actual trata hidratação assíncrona; introduzir `persist` implica adicionar tratamento de "ainda a hidratar" nos ecrãs que consomem `usePantry`/`useSavedRecipes` para não mostrar `loading: false`/lista vazia por um instante antes da store carregar do disco.
6. **Fiabilidade de `isInternetReachable`**: dado o bug documentado (issue #615) de falsos negativos persistentes, decidir a exacta condição de "mostrar banner offline" (só `isConnected === false`, ou também `isInternetReachable === false` sustentado) para evitar banners intermitentes/falsos.
