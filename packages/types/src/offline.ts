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
