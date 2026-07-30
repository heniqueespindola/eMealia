import type { SavedRecipe } from '@emealia/types';
import { getDb } from './db';

interface SavedRecipeRow {
  id:            string;
  user_id:       string;
  recipe_id:     string;
  titulo:        string;
  fonte:         string;
  thumbnail_url: string | null;
  source_url:    string | null;
  macros:        string | null;
  tempo_minutos: number | null;
  filtros:       string;
  colecao:       string;
  created_at:    string;
  updated_at:    string;
}

function rowToSavedRecipe(row: SavedRecipeRow): SavedRecipe {
  return {
    ...row,
    fonte:   row.fonte as SavedRecipe['fonte'],
    macros:  row.macros ? JSON.parse(row.macros) : null,
    filtros: JSON.parse(row.filtros),
  };
}

export async function getCachedItems(userId: string): Promise<SavedRecipe[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<SavedRecipeRow>(
    'SELECT * FROM saved_recipes_cache WHERE user_id = ? ORDER BY created_at DESC',
    [userId]
  );
  return rows.map(rowToSavedRecipe);
}

export async function replaceCachedItems(userId: string, items: SavedRecipe[]): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM saved_recipes_cache WHERE user_id = ?', [userId]);
    for (const item of items) {
      await db.runAsync(
        `INSERT OR REPLACE INTO saved_recipes_cache
           (id, user_id, recipe_id, titulo, fonte, thumbnail_url, source_url, macros, tempo_minutos, filtros, colecao, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          item.id,
          item.user_id,
          item.recipe_id,
          item.titulo,
          item.fonte,
          item.thumbnail_url,
          item.source_url,
          item.macros ? JSON.stringify(item.macros) : null,
          item.tempo_minutos,
          JSON.stringify(item.filtros),
          item.colecao,
          item.created_at,
          item.updated_at,
        ]
      );
    }
  });
}
