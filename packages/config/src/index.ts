export * from './macros';

export const colors = {
  bgDark:       '#1B2632',
  bgDarkAlt:    '#2C3B4D',
  border:       '#C9C1B1',
  bgLight:      '#EEE9DF',
  primary:      '#FFB162',
  primaryDark:  '#A35139',
  black:        '#000000',
  white:        '#FFFFFF',
  textPrimary:  '#000000',
  textInverted: '#FFFFFF',
  textMuted:    '#C9C1B1',
  youtube:      '#FF0000',
  tiktok:       '#010101',
  instagram:    '#C13584',
  emealia:      '#FFB162',
} as const;

export const PLANS = {
  free: {
    price: 0, label: 'Grátis', melhorValor: false,
    features: {
      planeamento_semanal: false,
      macros: false,
      export_lembretes: false,
      despensa_ilimitada: false,
      favoritos_ilimitados: false,
    },
  },
  premium_monthly: {
    price: 4.99, label: 'Premium Mensal', melhorValor: false,
    features: {
      planeamento_semanal: true,
      macros: true,
      export_lembretes: true,
      despensa_ilimitada: true,
      favoritos_ilimitados: true,
    },
  },
  premium_annual: {
    price: 34.99, label: 'Premium Anual', melhorValor: true,
    features: {
      planeamento_semanal: true,
      macros: true,
      export_lembretes: true,
      despensa_ilimitada: true,
      favoritos_ilimitados: true,
    },
  },
} as const;

export const LIMITS = {
  free: {
    pantry_items:    20,
    saved_recipes:   10,
    daily_feed:       5,
  },
  premium: {
    pantry_items:    Infinity,
    saved_recipes:   Infinity,
    daily_feed:      Infinity,
  },
} as const;

export const FILTROS_DIETETICOS = [
  { value: 'vegan',          label: 'Vegan' },
  { value: 'vegetariano',    label: 'Vegetariano' },
  { value: 'sem_gluten',     label: 'Sem Glúten' },
  { value: 'sem_lactose',    label: 'Sem Lactose' },
  { value: 'airfryer',       label: 'Airfryer' },
  { value: 'rapida',         label: 'Rápida (< 30min)' },
  { value: 'fria',           label: 'Sem cozedura' },
  { value: 'sobremesa',      label: 'Sobremesa' },
  { value: 'pequeno_almoco', label: 'Pequeno-almoço' },
] as const;

export const DEFAULT_COLECOES = [
  { value: 'favoritos',         label: 'Favoritos' },
  { value: 'para_experimentar', label: 'Para experimentar' },
  { value: 'semana',            label: 'Semana' },
] as const;

export const FONTES_FAVORITOS = [
  { value: 'youtube',     label: 'YouTube' },
  { value: 'tiktok',      label: 'TikTok' },
  { value: 'instagram',   label: 'Instagram' },
  { value: 'spoonacular', label: 'Spoonacular' },
] as const;
