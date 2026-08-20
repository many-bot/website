import { pt } from './pt';
import { en } from './en';

export type Locale = 'pt' | 'en';

export const dictionaries = { pt, en };

/** pt é o locale raiz (sem prefixo), en vive em /en/... */
export function getLocale(pathname: string): Locale {
  return pathname.startsWith('/en/') || pathname === '/en' ? 'en' : 'pt';
}

export function base(locale: Locale): string {
  return locale === 'en' ? '/en' : '';
}
