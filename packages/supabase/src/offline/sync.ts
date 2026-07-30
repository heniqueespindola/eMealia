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
