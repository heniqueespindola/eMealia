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

export interface RecipeSearchResult {
  id:                    string;
  titulo:                string;
  thumbnail_url:         string;
  source_url:            string | null;
  tempo_minutos:         number | null;
  macros:                MacroNutrients | null;
  filtros:               FiltroDietetico[];
  ingredientes_usados:   string[];
  ingredientes_em_falta: string[];
  total_ingredientes:    number;
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
