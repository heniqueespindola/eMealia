export type CategoriaDespensa = 'frescos' | 'secos' | 'congelados' | 'outros';

export interface PantryItem {
  id:         string;
  user_id:    string;
  nome:       string;
  quantidade: string | null;
  barcode:    string | null;
  categoria:  CategoriaDespensa;
  expira_em:  string | null;
  created_at: string;
  updated_at: string;
}

export interface ShoppingListItem {
  id:         string;
  user_id:    string;
  nome:       string;
  quantidade: string | null;
  comprado:   boolean;
  recipe_id:  string | null;
  created_at: string;
}
