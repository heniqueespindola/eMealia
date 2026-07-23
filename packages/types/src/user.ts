export type Plano = 'free' | 'premium_monthly' | 'premium_annual';

export type FiltroDietetico =
  | 'vegan'
  | 'vegetariano'
  | 'sem_gluten'
  | 'sem_lactose'
  | 'airfryer'
  | 'rapida'
  | 'fria'
  | 'sobremesa'
  | 'pequeno_almoco';

export type Momento = 'pequeno_almoco' | 'almoco' | 'jantar' | 'lanche';

export interface Profile {
  id:                    string;
  nome:                  string | null;
  email:                 string;
  avatar_url:            string | null;
  filtros_dieteticos:    FiltroDietetico[];
  plano:                 Plano;
  revenuecat_id:         string | null;
  gdpr_consent:          boolean;
  gdpr_consent_at:       string | null;
  frequencia_cozinha:    number | null;
  onboarding_completo:   boolean;
  created_at:            string;
}
