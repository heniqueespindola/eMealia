import * as Crypto from 'expo-crypto';
import type { Database, OutboxEntry, PantryItem } from '@emealia/types';
import { getDb } from './db';

type PantryInsert = Database['public']['Tables']['pantry_items']['Insert'];

export async function getCachedItems(userId: string): Promise<PantryItem[]> {
  const db = await getDb();
  return db.getAllAsync<PantryItem>(
    'SELECT * FROM pantry_items_cache WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
}

export async function replaceCachedItems(userId: string, items: PantryItem[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM pantry_items_cache WHERE user_id = ?', [userId]);
    for (const item of items) {
      await insertCachedItem(item);
    }
  });
}

export async function upsertCachedItem(item: PantryItem): Promise<void> {
  await insertCachedItem(item);
}

export async function deleteCachedItem(id: string): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM pantry_items_cache WHERE id = ?', [id]);
}

export async function addOffline(
  userId: string,
  item: Omit<PantryInsert, 'user_id'>
): Promise<PantryItem> {
  const now = new Date().toISOString();
  const fullItem: PantryItem = {
    id:         Crypto.randomUUID(),
    user_id:    userId,
    nome:       item.nome,
    quantidade: item.quantidade ?? null,
    barcode:    item.barcode ?? null,
    categoria:  item.categoria ?? 'outros',
    expira_em:  item.expira_em ?? null,
    created_at: now,
    updated_at: now,
  };

  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await insertCachedItem(fullItem);
    await insertOutboxEntry({
      id:         Crypto.randomUUID(),
      entity:     'pantry_items',
      entity_id:  fullItem.id,
      op:         'upsert',
      payload:    JSON.stringify(fullItem),
      created_at: Date.now(),
      attempts:   0,
      last_error: null,
    });
  });

  return fullItem;
}

export async function updateOffline(
  id: string,
  updates: Partial<PantryItem>
): Promise<PantryItem | null> {
  const db = await getDb();
  const current = await db.getFirstAsync<PantryItem>(
    'SELECT * FROM pantry_items_cache WHERE id = ?',
    [id]
  );
  if (!current) return null;

  const merged: PantryItem = { ...current, ...updates, updated_at: new Date().toISOString() };

  await db.withTransactionAsync(async () => {
    await insertCachedItem(merged);
    await insertOutboxEntry({
      id:         Crypto.randomUUID(),
      entity:     'pantry_items',
      entity_id:  merged.id,
      op:         'upsert',
      payload:    JSON.stringify(merged),
      created_at: Date.now(),
      attempts:   0,
      last_error: null,
    });
  });

  return merged;
}

export async function removeOffline(id: string): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM pantry_items_cache WHERE id = ?', [id]);
    await insertOutboxEntry({
      id:         Crypto.randomUUID(),
      entity:     'pantry_items',
      entity_id:  id,
      op:         'delete',
      payload:    JSON.stringify({ id }),
      created_at: Date.now(),
      attempts:   0,
      last_error: null,
    });
  });
}

async function insertCachedItem(item: PantryItem): Promise<void> {
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
}

async function insertOutboxEntry(entry: OutboxEntry): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO outbox
       (id, entity, entity_id, op, payload, created_at, attempts, last_error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.id,
      entry.entity,
      entry.entity_id,
      entry.op,
      entry.payload,
      entry.created_at,
      entry.attempts,
      entry.last_error,
    ]
  );
}
