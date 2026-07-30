import type { Idioma } from '@emealia/types';

const IDIOMA_TO_BCP47: Record<Idioma, string> = { 'pt-PT': 'pt-PT', 'es-ES': 'es-ES', en: 'en-US' };

export function formatarData(date: Date, idioma: Idioma | null | undefined, options: Intl.DateTimeFormatOptions = { dateStyle: 'long' }) {
  return new Intl.DateTimeFormat(idioma ? IDIOMA_TO_BCP47[idioma] : 'pt-PT', options).format(date);
}
