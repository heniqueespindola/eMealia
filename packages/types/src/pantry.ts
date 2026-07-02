export interface PantryItem {
  id:         string;
  user_id:    string;
  nome:       string;
  quantidade: string | null;
  barcode:    string | null;
  expira_em:  string | null;
  created_at: string;
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
