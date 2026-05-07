'use client';
import { useEffect } from 'react';

/**
 * Met à jour document.documentElement.lang côté client selon la locale next-intl.
 * Nécessaire car <html lang> est défini dans le root layout (statique = 'fr').
 */
export function LangSetter({ locale }: { locale: string }) {
  useEffect(() => {
    if (typeof document !== 'undefined' && document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);
  return null;
}
