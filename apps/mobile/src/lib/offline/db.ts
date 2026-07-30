import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let dbPromise: Promise<SQLiteDatabase> | null = null;

async function initSchema(db: SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

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
  `);
}

export function getDb(): Promise<SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync('emealia_offline.db').then(async (db) => {
      await initSchema(db);
      return db;
    });
  }
  return dbPromise;
}
