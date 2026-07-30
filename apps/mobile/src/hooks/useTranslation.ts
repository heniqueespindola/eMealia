import { useEffect } from 'react';
import { useProfileStore } from '@/stores/profileStore';
import { i18n, setLocale } from '@/i18n';

export function useTranslation() {
  const idioma = useProfileStore((s) => s.profile?.idioma);

  useEffect(() => { setLocale(idioma); }, [idioma]);

  return { t: i18n.t.bind(i18n), idioma: i18n.locale };
}
