import type { Momento } from './user';
import type { RecipeSource } from './recipe';

export interface MealPlanItem {
  id:            string;
  user_id:       string;
  semana_inicio: string;
  dia_semana:    number;
  momento:       Momento;
  recipe_id:     string | null;
  titulo:        string | null;
  fonte:         RecipeSource | null;
  created_at:    string;
}
