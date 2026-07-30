import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import { pt, es, en } from './translations';
import type { Idioma } from '@emealia/types';

export const i18n = new I18n({ pt, es, en });
i18n.enableFallback = true;
i18n.defaultLocale = 'pt';
i18n.locale = deviceLocale();

const IDIOMA_TO_LOCALE: Record<Idioma, 'pt' | 'es' | 'en'> = { 'pt-PT': 'pt', 'es-ES': 'es', en: 'en' };

export function setLocale(idioma: Idioma | null | undefined) {
  i18n.locale = idioma ? IDIOMA_TO_LOCALE[idioma] : deviceLocale();
}

function deviceLocale(): 'pt' | 'es' | 'en' {
  const tag = Localization.getLocales()[0]?.languageCode;
  if (tag === 'es') return 'es';
  if (tag === 'en') return 'en';
  return 'pt';
}
