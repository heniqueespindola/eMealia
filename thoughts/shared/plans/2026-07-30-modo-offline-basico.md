---
data: 2026-07-30
feature: "Modo Offline Básico"
research: "thoughts/shared/research/2026-07-30-modo-offline-basico.md"
status: completo
---

# Spec: Modo Offline Básico

## Visão Geral
Introduz persistência local (expo-sqlite) e sincronização automática ao reconectar para três áreas — despensa (leitura+escrita offline com fila de operações pendentes e last-write-wins), favoritos (leitura offline) e últimas 20 receitas vistas — mais um banner global de estado de rede e mensagens de erro claras em pesquisa/feed quando falham por falta de ligação.

## Decisões de arquitectura (resolvidas antes desta spec)

1. **"Receita vista"** = abertura do `RecipeDetailModal` existente (hoje só invocado a partir de `favoritos.tsx`). Pesquisa (`search.tsx`) não ganha um novo ecrã de detalhe nesta feature — mantém-se fora do escopo de cache, conforme o ticket.
2. **Localização da lógica de sync**: a lógica de negócio *platform-agnostic* (merge last-write-wins, processamento do outbox, tipos) vive em `packages/supabase/src/offline/`. **Importante:** `packages/supabase` é hoje consumido por `apps/web` (Next.js) e só depende de `@supabase/supabase-js` — não pode ganhar uma dependência de `expo-sqlite` (módulo nativo Expo/RN, incompatível com Next.js). Por isso o *adapter* concreto que fala com SQLite fica em `apps/mobile/src/lib/offline/`, injectado nas funções de `packages/supabase/src/offline/` via uma interface (`OfflineStorageAdapter`). `packages/supabase` continua sem qualquer import de `expo-sqlite`.

## Ficheiros a Criar

### `packages/types/src/offline.ts`
**Propósito:** tipos partilhados do outbox/sync.
```typescript
export type OutboxOp = 'upsert' | 'delete';
export type OutboxEntity = 'pantry_items';

export interface OutboxEntry {
  id:              string;      // = idempotency_key
  entity:          OutboxEntity;
  entity_id:       string;
  op:              OutboxOp;
  payload:         string;      // JSON serializado
  created_at:      number;      // epoch ms
  attempts:        number;
  last_error:      string | null;
}

export interface SyncResult {
  processed: number;
  failed:    number;
}
```
Adicionar `export * from './offline';` em `packages/types/src/index.ts`.

### `packages/supabase/src/offline/types.ts`
**Propósito:** interface que o adapter mobile (SQLite) tem de implementar.
```typescript
import type { OutboxEntry, PantryItem } from '@emealia/types';

export interface OfflineStorageAdapter {
  getOutboxEntries():                          Promise<OutboxEntry[]>;
  removeOutboxEntry(id: string):                Promise<void>;
  markOutboxEntryFailed(id: string, error: string): Promise<void>;
  upsertCachedPantryItem(item: PantryItem):     Promise<void>;
  deleteCachedPantryItem(id: string):           Promise<void>;
}
```

### `packages/supabase/src/offline/lastWriteWins.ts`
**Propósito:** função pura de resolução de conflito.
```typescript
export function resolveConflict(
  local:  { updated_at: string },
  remote: { updated_at: string }
): 'local' | 'remote' {
  return new Date(local.updated_at).getTime() >= new Date(remote.updated_at).getTime()
    ? 'local'
    : 'remote';
}
```

### `packages/supabase/src/offline/sync.ts`
**Propósito:** processa o outbox contra o Supabase, aplicando last-write-wins por entrada; falhas individuais não bloqueiam as restantes.
```typescript
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, PantryItem, SyncResult } from '@emealia/types';
import { deletePantryItem, getPantryItemById, upsertPantryItem } from '../queries/pantry';
import { resolveConflict } from './lastWriteWins';
import type { OfflineStorageAdapter } from './types';

export async function processOutbox(
  adapter: OfflineStorageAdapter,
  client:  SupabaseClient<Database>
): Promise<SyncResult> {
  const entries = await adapter.getOutboxEntries();
  let processed = 0;
  let failed = 0;

  for (const entry of entries) {
    try {
      if (entry.entity === 'pantry_items') {
        if (entry.op === 'delete') {
          await deletePantryItem(client, entry.entity_id);
        } else {
          const local = JSON.parse(entry.payload) as PantryItem;
          const { data: remote } = await getPantryItemById(client, entry.entity_id);
          if (remote && resolveConflict(local, remote) === 'remote') {
            await adapter.upsertCachedPantryItem(remote);
          } else {
            const { data } = await upsertPantryItem(client, local);
            if (data) await adapter.upsertCachedPantryItem(data);
          }
        }
      }
      await adapter.removeOutboxEntry(entry.id);
      processed++;
    } catch (err) {
      await adapter.markOutboxEntryFailed(entry.id, err instanceof Error ? err.message : String(err));
      failed++;
    }
  }

  return { processed, failed };
}
```
Nota: percorrer `entries` sequencialmente (não `Promise.all`) para preservar a ordem de ocorrência exigida pelo critério de aceitação.

### `apps/mobile/src/lib/offline/db.ts`
**Propósito:** singleton da base de dados SQLite + inicialização do schema local.
- `openDatabaseAsync('emealia_offline.db')`, `PRAGMA journal_mode = WAL`.
- `getDb(): Promise<SQLiteDatabase>` — abre uma vez, reutiliza a mesma instância.
- `initSchema(db)` chamado dentro de `getDb()` na primeira abertura, com `CREATE TABLE IF NOT EXISTS` para:
```sql
CREATE TABLE IF NOT EXISTS pantry_items_cache (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, nome TEXT NOT NULL,
  quantidade TEXT, barcode TEXT, categoria TEXT NOT NULL,
  expira_em TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS saved_recipes_cache (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL, recipe_id TEXT NOT NULL,
  titulo TEXT NOT NULL, fonte TEXT NOT NULL, thumbnail_url TEXT, source_url TEXT,
  macros TEXT, tempo_minutos INTEGER, filtros TEXT NOT NULL,
  colecao TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS viewed_recipes_cache (
  id TEXT PRIMARY KEY, payload TEXT NOT NULL, viewed_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS outbox (
  id TEXT PRIMARY KEY, entity TEXT NOT NULL, entity_id TEXT NOT NULL,
  op TEXT NOT NULL, payload TEXT NOT NULL, created_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT
);
CREATE INDEX IF NOT EXISTS pantry_items_cache_user_idx ON pantry_items_cache(user_id);
CREATE INDEX IF NOT EXISTS outbox_created_at_idx ON outbox(created_at);
```

### `apps/mobile/src/lib/offline/pantryCache.ts`
**Propósito:** única porta de entrada para leitura/escrita local da despensa + enfileiramento no outbox. Usada por `usePantry.ts`.
- `getCachedItems(userId: string): Promise<PantryItem[]>` — `SELECT * FROM pantry_items_cache WHERE user_id = ? ORDER BY created_at DESC`.
- `replaceCachedItems(userId: string, items: PantryItem[]): Promise<void>` — dentro de `db.withTransactionAsync`: `DELETE FROM pantry_items_cache WHERE user_id = ?` + insert de cada item. Chamado após um `fetchItems` online bem-sucedido (write-through).
- `upsertCachedItem(item: PantryItem): Promise<void>` — `INSERT OR REPLACE`. Chamado após mutações online bem-sucedidas.
- `deleteCachedItem(id: string): Promise<void>`.
- `addOffline(userId: string, item: Omit<PantryInsert, 'user_id'>): Promise<PantryItem>` — gera `id` via `Crypto.randomUUID()` (expo-crypto) e `created_at`/`updated_at` = `new Date().toISOString()`; dentro de **uma única transacção** (`db.withTransactionAsync`): insere em `pantry_items_cache` + insere entrada `outbox` (`op: 'upsert'`, `id` da entrada = `Crypto.randomUUID()`, `payload` = JSON do item completo); devolve o `PantryItem` completo.
- `updateOffline(id: string, updates: Partial<PantryItem>): Promise<PantryItem | null>` — lê a linha actual, faz merge com `updates` + `updated_at` novo; mesma transacção local-write + outbox `op: 'upsert'` (payload = item merged completo).
- `removeOffline(id: string): Promise<void>` — mesma transacção: `DELETE FROM pantry_items_cache WHERE id = ?` + outbox `op: 'delete'` (payload = `{ id }`).

### `apps/mobile/src/lib/offline/savedRecipesCache.ts`
**Propósito:** cache só-de-leitura de favoritos.
- `getCachedItems(userId: string): Promise<SavedRecipe[]>`.
- `replaceCachedItems(userId: string, items: SavedRecipe[]): Promise<void>` — mesmo padrão de `pantryCache.replaceCachedItems`, chamado após `fetchItems` online com sucesso em `useSavedRecipes`.

### `apps/mobile/src/lib/offline/recipeCache.ts`
**Propósito:** cache FIFO das últimas 20 receitas vistas.
- `cacheViewedRecipe(recipe: SavedRecipe): Promise<void>` — dentro de transacção: `INSERT OR REPLACE INTO viewed_recipes_cache (id, payload, viewed_at) VALUES (?, ?, ?)` com `viewed_at = now`, seguido de eviction:
```sql
DELETE FROM viewed_recipes_cache
WHERE id NOT IN (SELECT id FROM viewed_recipes_cache ORDER BY viewed_at DESC LIMIT 20)
```
- `getViewedRecipesCache(): Promise<SavedRecipe[]>` — `SELECT payload FROM viewed_recipes_cache ORDER BY viewed_at DESC`, `JSON.parse` de cada `payload`.

Usar a constante `20` a partir de `LIMITS` (ver alteração em `packages/config`), não hardcoded.

### `apps/mobile/src/lib/offline/sqliteAdapter.ts`
**Propósito:** implementação concreta de `OfflineStorageAdapter` (de `@emealia/supabase`) sobre `db.ts` — único ponto onde `sync.ts`/`processOutbox` toca em SQLite.
```typescript
import type { OfflineStorageAdapter } from '@emealia/supabase';
import { getDb } from './db';

export const sqliteAdapter: OfflineStorageAdapter = {
  async getOutboxEntries() { /* SELECT * FROM outbox ORDER BY created_at ASC */ },
  async removeOutboxEntry(id) { /* DELETE FROM outbox WHERE id = ? */ },
  async markOutboxEntryFailed(id, error) { /* UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ? */ },
  async upsertCachedPantryItem(item) { /* INSERT OR REPLACE INTO pantry_items_cache ... */ },
  async deleteCachedPantryItem(id) { /* DELETE FROM pantry_items_cache WHERE id = ? */ },
};
```

### `apps/mobile/src/hooks/useNetworkStatus.ts`
**Propósito:** hook partilhado de estado de rede.
```typescript
import { useNetInfo } from '@react-native-community/netinfo';

export function useNetworkStatus() {
  const netInfo = useNetInfo();
  // isConnected === false é o sinal fiável (ver research: isInternetReachable
  // tem bug documentado de falso-negativo persistente — issue #615).
  const isOffline = netInfo.isConnected === false;
  return { isOffline, isConnected: netInfo.isConnected, isInternetReachable: netInfo.isInternetReachable };
}
```

### `apps/mobile/src/components/ui/OfflineBanner.tsx`
**Propósito:** banner global, usando tokens de `theme.ts`.
```tsx
import { View, Text } from 'react-native';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { colors, fonts, spacing } from '@/constants/theme';

export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  if (!isOffline) return null;
  return (
    <View style={{ backgroundColor: colors.primaryDark, paddingVertical: spacing.xs, paddingHorizontal: spacing.md }}>
      <Text style={{ fontFamily: fonts.medium, fontSize: 13, color: colors.textInverted, textAlign: 'center' }}>
        Modo offline — algumas funcionalidades podem não estar disponíveis
      </Text>
    </View>
  );
}
```

### `apps/mobile/src/hooks/useSyncManager.ts`
**Propósito:** dispara `processOutbox` quando a app volta a ficar online; evita syncs sobrepostos.
```typescript
import { useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { processOutbox } from '@emealia/supabase';
import { supabase } from '@/lib/supabase';
import { sqliteAdapter } from '@/lib/offline/sqliteAdapter';
import { usePantryStore } from '@/stores/pantryStore';
import { getCachedItems } from '@/lib/offline/pantryCache';

export function useSyncManager(userId: string | undefined) {
  const syncingRef = useRef(false);

  useEffect(() => {
    if (!userId || !supabase) return;
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected && !syncingRef.current) {
        syncingRef.current = true;
        processOutbox(sqliteAdapter, supabase)
          .then(() => getCachedItems(userId))
          .then((items) => usePantryStore.getState().setItems(userId, items))
          .finally(() => { syncingRef.current = false; });
      }
    });
    return unsubscribe;
  }, [userId]);
}
```

## Ficheiros a Modificar

### `packages/types/src/pantry.ts`
- [ ] Acrescentar `updated_at: string;` a `PantryItem` (depois de `created_at`).

### `packages/types/src/recipe.ts`
- [ ] Acrescentar `updated_at: string;` a `SavedRecipe` (depois de `created_at`).

### `packages/types/src/index.ts`
- [ ] Acrescentar `export * from './offline';`.

### `packages/types/src/database.ts`
- [ ] `pantry_items.Insert`: manter `Omit<PantryItem, 'id' | 'created_at' | 'categoria'>` — como `updated_at` já fica incluído no `Omit`, não requer alteração adicional (o `updated_at` é definido pelo trigger/servidor; `Insert` já o omite via `Omit<..., 'created_at'>`? **Não** — `updated_at` é um campo novo separado de `created_at`, por isso adicionar explicitamente `'updated_at'` à lista de `Omit` em `pantry_items.Insert` (linha 25) e `saved_recipes.Insert` (linha 31), tal como já acontece para `created_at`.

### `packages/config/src/index.ts`
- [ ] Em `LIMITS`, acrescentar `offline_recipe_cache: 20` a um novo grupo `OFFLINE_LIMITS` (não dentro de `free`/`premium`, é igual para todos os planos):
```typescript
export const OFFLINE_LIMITS = {
  recipe_cache_size: 20,
} as const;
```

### `packages/supabase/src/queries/pantry.ts`
- [ ] Acrescentar `getPantryItemById(client, id: string)`:
```typescript
export async function getPantryItemById(client: SupabaseClient<Database>, id: string) {
  return client.from('pantry_items').select('*').eq('id', id).maybeSingle();
}
```
- [ ] Acrescentar `upsertPantryItem(client, item: PantryItem)`:
```typescript
export async function upsertPantryItem(client: SupabaseClient<Database>, item: PantryItem) {
  return client.from('pantry_items').upsert(item, { onConflict: 'id' }).select().single();
}
```

### `packages/supabase/src/index.ts`
- [ ] Acrescentar `export * from './offline/types';`, `export * from './offline/sync';`, `export * from './offline/lastWriteWins';`.

### `supabase/schema.sql`
- [ ] Depois do bloco `-- ─── Pantry Items` (linhas ~44-64): acrescentar
```sql
ALTER TABLE pantry_items ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
```
- [ ] Depois do bloco `-- ─── Saved Recipes` (linhas ~67-90): acrescentar
```sql
ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
```
- [ ] Acrescentar, uma única vez perto do fim do ficheiro (primeiro trigger de `updated_at` do schema):
```sql
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pantry_items_set_updated_at ON pantry_items;
CREATE TRIGGER pantry_items_set_updated_at BEFORE UPDATE ON pantry_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS saved_recipes_set_updated_at ON saved_recipes;
CREATE TRIGGER saved_recipes_set_updated_at BEFORE UPDATE ON saved_recipes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```
- [ ] Nota no topo do ficheiro (ou no README) a lembrar que esta alteração tem de ser corrida manualmente no SQL Editor do Supabase Dashboard (não há sistema de migrations neste projecto).

### `apps/mobile/package.json`
- [ ] Adicionar dependência `"@react-native-community/netinfo": "^11.4.1"`. Instalar com `npm install @react-native-community/netinfo` a partir da raiz do monorepo (nunca `npx expo install`, por causa do `legacy-peer-deps=true` no `.npmrc`).

### `apps/mobile/app/_layout.tsx`
- [ ] Importar `OfflineBanner` de `@/components/ui/OfflineBanner` e `useSyncManager` de `@/hooks/useSyncManager`.
- [ ] Chamar `useSyncManager(session?.user?.id)` junto às outras chamadas de hooks (linha ~27-28).
- [ ] Montar `<OfflineBanner />` como primeiro filho dentro de `<GestureHandlerRootView>`, antes de `<Stack .../>` (linha ~39-41):
```tsx
<GestureHandlerRootView style={{ flex: 1 }}>
  <OfflineBanner />
  <Stack screenOptions={{ headerShown: false }} />
</GestureHandlerRootView>
```

### `apps/mobile/src/hooks/usePantry.ts`
- [ ] Importar `useNetworkStatus` e as funções de `@/lib/offline/pantryCache` (`getCachedItems`, `replaceCachedItems`, `upsertCachedItem`, `deleteCachedItem`, `addOffline`, `updateOffline`, `removeOffline`).
- [ ] `fetchItems`: se `isOffline`, ler de `pantryCache.getCachedItems(uid)` e `setItems`, sem chamar `getPantry`. Se online, manter comportamento actual e, após sucesso, chamar `pantryCache.replaceCachedItems(uid, items)` (write-through).
- [ ] `add`: se `isOffline`, chamar `pantryCache.addOffline(userId, item)` e `usePantryStore.getState().addItem(...)` com o resultado; devolver sem chamar `addPantryItem`. Se online, manter comportamento actual e, após sucesso, chamar `pantryCache.upsertCachedItem(data)`.
- [ ] `update`: mesmo padrão com `pantryCache.updateOffline`/`upsertCachedItem`.
- [ ] `remove`: mesmo padrão com `pantryCache.removeOffline`/`deleteCachedItem`.
- [ ] Âmbito: o caminho **online** de `add` continua a usar `addPantryItem` (id gerado pelo servidor) — não migrar para `upsertPantryItem` no caminho online, para não alargar o diff além do necessário. Só os items criados offline usam id gerado no cliente + `upsertPantryItem` no sync (ver `sync.ts`).

### `apps/mobile/src/hooks/useSavedRecipes.ts`
- [ ] Importar `useNetworkStatus` e `getCachedItems`/`replaceCachedItems` de `@/lib/offline/savedRecipesCache`.
- [ ] `fetchItems`: se `isOffline`, ler de `savedRecipesCache.getCachedItems(uid)` e `setItems`, sem chamar `getSavedRecipes`. Se online, manter comportamento actual e, após sucesso, chamar `savedRecipesCache.replaceCachedItems(uid, items)`.
- [ ] `save`: no topo da função, `if (isOffline) return;` (favoritos são só-leitura offline nesta fase, conforme o ticket — sem UI adicional de aviso, o banner global já comunica o estado).

### `apps/mobile/src/components/recipe/RecipeDetailModal.tsx`
- [ ] Importar `useEffect` de `'react'` e `cacheViewedRecipe` de `@/lib/offline/recipeCache`.
- [ ] Mover o `if (!recipe) return null;` (linha 26) para **depois** de um novo `useEffect` (Rules of Hooks — hoje o componente não tem hooks, por isso o early-return está antes de qualquer hook, mas passa a ser inválido assim que se acrescenta um):
```tsx
export function RecipeDetailModal({ visible, recipe, onClose, onAddToList, podeAdicionarLista, addingToList }: RecipeDetailModalProps) {
  useEffect(() => {
    if (recipe) cacheViewedRecipe(recipe);
  }, [recipe?.id]);

  if (!recipe) return null;
  ...
```

### `apps/mobile/src/hooks/useFeed.ts`
- [ ] Importar `useNetworkStatus`.
- [ ] No início de `fetchFeed` (antes da query Supabase, linha ~16-17): se `isOffline`, `setVideos([])`, `setError('Sem ligação à internet — o feed de vídeos precisa de rede.')`, `setLoading(false)`, `return` (sem tentar a query). Feed não é cacheado offline nesta feature (fora do escopo) — só evita spinner infinito/erro genérico.

### `apps/mobile/src/hooks/useRecipeSearch.ts`
- [ ] Importar `useNetworkStatus`.
- [ ] No `useEffect` de pesquisa (linhas 12-30): se `isOffline` e `ingredients.length > 0`, `setResults([])`, `setError('Sem ligação à internet — a pesquisa de receitas precisa de rede.')`, `setLoading(false)`, sem chamar `supabase.functions.invoke`.

### `apps/mobile/app/(tabs)/index.tsx`
- [ ] Desestruturar também `error` de `useFeed(...)` (linha 27).
- [ ] No bloco condicional que hoje só olha para `loading` (linhas 77-84), acrescentar um ramo antes do `loading ? ... : ...`: se `error`, mostrar `<Text>` centrado com o `error` (mesmo padrão visual dos outros estados vazios do ecrã, `colors.textMuted`, `fonts.regular`), em vez do `CarouselStrip` vazio.

### `apps/mobile/app/(tabs)/search.tsx`
- [ ] Desestruturar também `error` de `useRecipeSearch()` (linha 31-32).
- [ ] No bloco condicional de resultados (linhas 144-172), acrescentar um ramo `error ? (<Text .../>) :` antes do ramo `loading` — mesmo padrão visual dos estados vazios existentes (`colors.textMuted`, `fonts.regular`), distinto da mensagem "Nenhuma receita encontrada".

## Fases de Implementação

### Fase 1: Schema e tipos partilhados
**Ficheiros:**
- Modificar `supabase/schema.sql`, `packages/types/src/pantry.ts`, `packages/types/src/recipe.ts`, `packages/types/src/database.ts`, `packages/types/src/index.ts`
- Criar `packages/types/src/offline.ts`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa em `packages/types`

**Critérios de sucesso (manuais):**
- [ ] Correr o `ALTER TABLE`/trigger novo manualmente no SQL Editor do Supabase Dashboard e confirmar `updated_at` muda ao fazer um `UPDATE` de teste em `pantry_items`

### Fase 2: Estado de rede e banner
**Ficheiros:**
- Modificar `apps/mobile/package.json` (netinfo), `apps/mobile/app/_layout.tsx`
- Criar `apps/mobile/src/hooks/useNetworkStatus.ts`, `apps/mobile/src/components/ui/OfflineBanner.tsx`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa em `apps/mobile`

**Critérios de sucesso (manuais):**
- [ ] Activar modo avião no simulador/dispositivo → banner aparece em qualquer ecrã da app
- [ ] Desactivar modo avião → banner desaparece automaticamente

### Fase 3: Camada SQLite local (mobile)
**Ficheiros:**
- Criar `apps/mobile/src/lib/offline/db.ts`, `pantryCache.ts`, `savedRecipesCache.ts`, `recipeCache.ts`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa em `apps/mobile`

**Critérios de sucesso (manuais):**
- [ ] Chamar `addOffline` num teste ad-hoc e confirmar (via `expo-sqlite` debug ou log) que a linha aparece em `pantry_items_cache` **e** em `outbox` na mesma verificação

### Fase 4: Lógica de sync partilhável + SyncManager
**Ficheiros:**
- Criar `packages/supabase/src/offline/types.ts`, `lastWriteWins.ts`, `sync.ts`
- Modificar `packages/supabase/src/index.ts`, `packages/supabase/src/queries/pantry.ts`
- Criar `apps/mobile/src/lib/offline/sqliteAdapter.ts`, `apps/mobile/src/hooks/useSyncManager.ts`
- Modificar `apps/mobile/app/_layout.tsx` (wire `useSyncManager`)

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa em `packages/supabase` e `apps/mobile`
- [ ] `packages/supabase` não tem nenhum import de `expo-sqlite` (`grep -r "expo-sqlite" packages/supabase/src` devolve vazio)

**Critérios de sucesso (manuais):**
- [ ] Com um item pendente no outbox, sair do modo avião → `processOutbox` corre, a entrada é removida do outbox e o item aparece em `pantry_items` no Supabase Dashboard

### Fase 5: Despensa offline (leitura + escrita + fila)
**Ficheiros:**
- Modificar `apps/mobile/src/hooks/usePantry.ts`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa em `apps/mobile`

**Critérios de sucesso (manuais):**
- [ ] Modo avião → abrir Despensa → itens carregados anteriormente continuam visíveis
- [ ] Modo avião → adicionar/editar/remover item → reflectido imediatamente na UI
- [ ] Fechar e reabrir a app ainda em modo avião → alterações persistem
- [ ] Reactivar rede → alterações aparecem no Supabase Dashboard; se o mesmo item foi alterado no servidor entretanto com timestamp mais recente, a versão do servidor prevalece

### Fase 6: Favoritos offline + cache de receitas vistas
**Ficheiros:**
- Modificar `apps/mobile/src/hooks/useSavedRecipes.ts`, `apps/mobile/src/components/recipe/RecipeDetailModal.tsx`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa em `apps/mobile`

**Critérios de sucesso (manuais):**
- [ ] Ver ≥ 21 receitas diferentes via `RecipeDetailModal` (favoritos) com rede activa, depois modo avião → só as últimas 20 permanecem no cache
- [ ] Modo avião → abrir Favoritos → lista completa continua visível a partir do cache
- [ ] Modo avião → tentar guardar uma nova receita (via `search.tsx`) → operação não é enviada (sem crash, sem erro visível para além do banner)

### Fase 7: Erros claros em pesquisa e feed sem rede
**Ficheiros:**
- Modificar `apps/mobile/src/hooks/useFeed.ts`, `apps/mobile/src/hooks/useRecipeSearch.ts`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/(tabs)/search.tsx`

**Critérios de sucesso (automáticos):**
- [ ] `tsc --noEmit` passa em `apps/mobile`

**Critérios de sucesso (manuais):**
- [ ] Modo avião → ecrã Homepage → mensagem clara em vez de spinner infinito
- [ ] Modo avião → pesquisar por ingredientes → mensagem clara em vez de spinner infinito ou "nenhuma receita encontrada"

## Estratégia de Testes
- **Manual (não há framework de testes automatizados no projecto hoje):** seguir os critérios manuais de cada fase, usando o modo avião do simulador iOS/emulador Android. Nota do research: no simulador iOS, mudanças de rede em background não disparam o evento do NetInfo — forçar `NetInfo.refresh()` ao voltar ao foreground se o banner não actualizar sozinho ao testar.
- **SQL:** validar o trigger `set_updated_at` directamente no SQL Editor do Supabase com um `UPDATE` de teste antes de confiar nele no fluxo de sync.

## Notas de Implementação
- **Sem sistema de migrations formal** — as alterações a `supabase/schema.sql` têm de ser coladas manualmente no SQL Editor do Supabase Dashboard (mesmo padrão já usado no projecto).
- **`packages/supabase` fica livre de `expo-sqlite`** — é a decisão de arquitectura mais importante desta spec; qualquer código novo em `packages/supabase/src/offline/` deve continuar a receber o storage via parâmetro (`OfflineStorageAdapter`), nunca importar `expo-sqlite` directamente.
- **IDs gerados no cliente só para items criados offline** — o caminho online de `add` mantém-se inalterado (id gerado pelo Postgres) para minimizar o diff; só `pantryCache.addOffline` gera `id` client-side com `Crypto.randomUUID()` (expo-crypto, já instalado), porque o outbox precisa de um id estável antes de existir no servidor.
- **Transacção local-write + outbox**: todas as funções `*Offline` em `pantryCache.ts` têm de fazer a escrita na tabela `pantry_items_cache` e a inserção em `outbox` dentro do **mesmo** `db.withTransactionAsync`, para nunca perder uma mutação sem o registo de sync correspondente (ver research).
- **`isInternetReachable` não é o sinal principal** — tem bug documentado (react-native-netinfo#615) de ficar `false` persistentemente após sair do modo avião. `useNetworkStatus` usa só `isConnected === false`.
- **Alcance da fila de sync**: só `pantry_items` tem fila de operações pendentes nesta fase (conforme AC do ticket). `saved_recipes` é só-leitura offline; não precisa de outbox.
- **Limite gratuito de despensa (20 itens)**: continua validado do lado do cliente em `pantry.tsx` (`LIMITS.free.pantry_items`) tal como hoje; operações offline não contornam esse limite (a UI já desabilita "+ Adicionar" quando `limitReached`).

## Referências
- Research: `thoughts/shared/research/2026-07-30-modo-offline-basico.md`
- Ticket: `thoughts/shared/tickets/2026-07-30-modo-offline-basico.md`
- Padrão de hook fetch-if-not-loaded a replicar: `apps/mobile/src/hooks/usePantry.ts:1-53` (versão actual, pré-alteração)
- Precedente de banner condicional: `apps/mobile/app/(tabs)/pantry.tsx:86-90`
- Único precedente de `error` exposto por hook de dados: `apps/mobile/src/hooks/useFeed.ts:13,39-41`
