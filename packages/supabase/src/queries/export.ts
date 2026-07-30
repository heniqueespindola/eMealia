import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@emealia/types';
import { getProfile } from './profile';
import { getPantry } from './pantry';
import { getSavedRecipes } from './recipes';
import { getShoppingList } from './shopping_list';
import { getMealPlanTodas } from './meal_plan';
import { getFollowedCreators } from './creators';

export async function exportUserData(client: SupabaseClient<Database>, userId: string) {
  const [profile, pantry, savedRecipes, shoppingList, mealPlan, followedCreators] = await Promise.all([
    getProfile(client, userId),
    getPantry(client, userId),
    getSavedRecipes(client, userId),
    getShoppingList(client, userId),
    getMealPlanTodas(client, userId),
    getFollowedCreators(client, userId),
  ]);

  return {
    exportado_em:      new Date().toISOString(),
    profile:           profile.data,
    pantry_items:      pantry.data,
    saved_recipes:     savedRecipes.data,
    shopping_list:     shoppingList.data,
    meal_plan:         mealPlan.data,
    followed_creators: followedCreators.data,
  };
}
