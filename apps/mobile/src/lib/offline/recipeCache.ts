import { OFFLINE_LIMITS } from '@emealia/config';
import type { SavedRecipe } from '@emealia/types';
import { getDb } from './db';

export async function cacheViewedRecipe(recipe: SavedRecipe): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'INSERT OR REPLACE INTO viewed_recipes_cache (id, payload, viewed_at) VALUES (?, ?, ?)',
      [recipe.id, JSON.stringify(recipe), new Date().toISOString()]
    );
    await db.runAsync(
      `DELETE FROM viewed_recipes_cache
       WHERE id NOT IN (SELECT id FROM viewed_recipes_cache ORDER BY viewed_at DESC LIMIT ?)`,
      [OFFLINE_LIMITS.recipe_cache_size]
    );
  });
}

export async function getViewedRecipesCache(): Promise<SavedRecipe[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ payload: string }>(
    'SELECT payload FROM viewed_recipes_cache ORDER BY viewed_at DESC'
  );
  return rows.map((row) => JSON.parse(row.payload));
}
