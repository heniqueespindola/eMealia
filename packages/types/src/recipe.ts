import type { FiltroDietetico, VideoSource } from './user';

export interface MacroNutrients {
  calorias:   number;
  proteinas:  number;
  hidratos:   number;
  gorduras:   number;
}

export type RecipeSource = VideoSource | 'spoonacular' | 'blog';

export interface Recipe {
  id:            string;
  titulo:        string;
  fonte:         RecipeSource;
  thumbnail_url: string;
  tempo_minutos: number;
  macros:        MacroNutrients;
  filtros:       FiltroDietetico[];
  ingredientes:  string[];
  source_url:    string;
}

export interface SavedRecipe {
  id:            string;
  user_id:       string;
  recipe_id:     string;
  titulo:        string;
  fonte:         RecipeSource;
  thumbnail_url: string | null;
  source_url:    string | null;
  macros:        MacroNutrients | null;
  filtros:       FiltroDietetico[];
  colecao:       string;
  created_at:    string;
}
