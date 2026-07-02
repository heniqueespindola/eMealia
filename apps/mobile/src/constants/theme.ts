export const colors = {
  // Backgrounds
  bgDark:       '#1B2632',
  bgDarkAlt:    '#2C3B4D',
  // Neutros
  border:       '#C9C1B1',
  bgLight:      '#EEE9DF',
  // Accent
  primary:      '#FFB162',
  primaryDark:  '#A35139',
  // Base
  black:        '#000000',
  white:        '#FFFFFF',
  // Texto
  textPrimary:  '#000000',
  textInverted: '#FFFFFF',
  textMuted:    '#C9C1B1',
  // Fontes de vídeo
  youtube:      '#FF0000',
  tiktok:       '#010101',
  instagram:    '#C13584',
  emealia:      '#FFB162',
} as const;

export const fonts = {
  display:  'PlayfairDisplay_700Bold',
  regular:  'Inter_400Regular',
  medium:   'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold:     'Inter_700Bold',
} as const;

export const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const radius = {
  sm:   6,
  md:   12,
  lg:   20,
  full: 9999,
} as const;
