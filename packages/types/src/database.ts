import type { Profile } from './user';
import type { CategoriaDespensa, PantryItem, ShoppingListItem } from './pantry';
import type { SavedRecipe } from './recipe';
import type { VideoItem } from './feed';
import type { MealPlanItem } from './planner';
import type { MacroDailyTotal } from './macros';
import type { Creator, FollowedCreator } from './creator';

// Achata interfaces em type literais: necessário para satisfazer o constraint
// `extends Record<string, unknown>` do GenericTable do @supabase/postgrest-js
// (interfaces não satisfazem esse check estrutural, ao contrário de type literais).
type Simplify<T> = { [K in keyof T]: T[K] };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row:           Simplify<Profile>;
        Insert:        Simplify<Partial<Profile> & { id: string; email: string }>;
        Update:        Simplify<Partial<Profile>>;
        Relationships: [];
      };
      pantry_items: {
        Row:           Simplify<PantryItem>;
        Insert:        Simplify<Omit<PantryItem, 'id' | 'created_at' | 'categoria'> & { categoria?: CategoriaDespensa }>;
        Update:        Simplify<Partial<PantryItem>>;
        Relationships: [];
      };
      saved_recipes: {
        Row:           Simplify<SavedRecipe>;
        Insert:        Simplify<Omit<SavedRecipe, 'id' | 'created_at'>>;
        Update:        Simplify<Partial<SavedRecipe>>;
        Relationships: [];
      };
      shopping_list: {
        Row:           Simplify<ShoppingListItem>;
        Insert:        Simplify<Omit<ShoppingListItem, 'id' | 'created_at'>>;
        Update:        Simplify<Partial<ShoppingListItem>>;
        Relationships: [];
      };
      video_cache: {
        Row:           Simplify<VideoItem>;
        Insert:        Simplify<Omit<VideoItem, 'id'>>;
        Update:        Simplify<Partial<VideoItem>>;
        Relationships: [];
      };
      meal_plan: {
        Row:           Simplify<MealPlanItem>;
        Insert:        Simplify<Omit<MealPlanItem, 'id' | 'created_at'>>;
        Update:        Simplify<Partial<MealPlanItem>>;
        Relationships: [];
      };
      macro_daily_totals: {
        Row:           Simplify<MacroDailyTotal>;
        Insert:        Simplify<Omit<MacroDailyTotal, 'id' | 'updated_at'>>;
        Update:        Simplify<Partial<MacroDailyTotal>>;
        Relationships: [];
      };
      creators: {
        Row:           Simplify<Creator>;
        Insert:        Simplify<Omit<Creator, 'id' | 'created_at'>>;
        Update:        Simplify<Partial<Creator>>;
        Relationships: [];
      };
      followed_creators: {
        Row:           Simplify<FollowedCreator>;
        Insert:        Simplify<Omit<FollowedCreator, 'id' | 'followed_at'>>;
        Update:        Simplify<Partial<FollowedCreator>>;
        Relationships: [];
      };
    };
    Views:     Record<string, never>;
    Functions: Record<string, never>;
  };
}
