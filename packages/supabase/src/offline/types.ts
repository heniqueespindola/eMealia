import type { OutboxEntry, PantryItem } from '@emealia/types';

export interface OfflineStorageAdapter {
  getOutboxEntries():                          Promise<OutboxEntry[]>;
  removeOutboxEntry(id: string):                Promise<void>;
  markOutboxEntryFailed(id: string, error: string): Promise<void>;
  upsertCachedPantryItem(item: PantryItem):     Promise<void>;
  deleteCachedPantryItem(id: string):           Promise<void>;
}
