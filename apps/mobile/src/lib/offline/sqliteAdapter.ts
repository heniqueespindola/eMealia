import type { OfflineStorageAdapter } from '@emealia/supabase';
import type { OutboxEntry, PantryItem } from '@emealia/types';
import { getDb } from './db';

export const sqliteAdapter: OfflineStorageAdapter = {
  async getOutboxEntries() {
    const db = await getDb();
    return db.getAllAsync<OutboxEntry>('SELECT * FROM outbox ORDER BY created_at ASC');
  },

  async removeOutboxEntry(id) {
    const db = await getDb();
    await db.runAsync('DELETE FROM outbox WHERE id = ?', [id]);
  },

  async markOutboxEntryFailed(id, error) {
    const db = await getDb();
    await db.runAsync('UPDATE outbox SET attempts = attempts + 1, last_error = ? WHERE id = ?', [error, id]);
  },

  async upsertCachedPantryItem(item: PantryItem) {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO pantry_items_cache
         (id, user_id, nome, quantidade, barcode, categoria, expira_em, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.id,
        item.user_id,
        item.nome,
        item.quantidade,
        item.barcode,
        item.categoria,
        item.expira_em,
        item.created_at,
        item.updated_at,
      ]
    );
  },

  async deleteCachedPantryItem(id) {
    const db = await getDb();
    await db.runAsync('DELETE FROM pantry_items_cache WHERE id = ?', [id]);
  },
};
