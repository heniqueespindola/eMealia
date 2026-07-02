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
  free:             { price: 0,     label: 'Grátis' },
  premium_monthly:  { price: 4.99,  label: 'Premium Mensal' },
  premium_annual:   { price: 34.99, label: 'Premium Anual' },
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
