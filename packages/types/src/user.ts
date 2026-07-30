import type { Sexo, NivelActividade, ObjectivoNutricional } from './macros';

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

export type Idioma = 'pt-PT' | 'es-ES' | 'en';

export type PlataformaSaude = 'ios' | 'android';

export interface NotificacoesPrefs {
  sugestoes_jantar: boolean;
  alertas_despensa: boolean;
}

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
  peso_kg:               number | null;
  altura_cm:             number | null;
  idade:                 number | null;
  sexo:                  Sexo | null;
  nivel_actividade:      NivelActividade | null;
  objectivo_nutricional: ObjectivoNutricional | null;
  meta_calorias:         number | null;
  meta_proteinas:        number | null;
  meta_hidratos:         number | null;
  meta_gorduras:         number | null;
  expo_push_token:       string | null;
  idioma:                Idioma;
  notificacoes_prefs:    NotificacoesPrefs;
  sync_saude_activo:     boolean;
  sync_saude_ultimo_em:  string | null;
  sync_saude_plataforma: PlataformaSaude | null;
}
