// Re-export everything from translations for easy imports
export {
  translations,
  defaultLocale,
  supportedLocales,
  getTranslations,
  type Locale,
  type TranslationKeys,
} from './translations';

// Helper to get current locale from URL or default
export function getLocaleFromUrl(url: URL): import('./translations').Locale {
  const pathname = url.pathname;
  const segments = pathname.split('/').filter(Boolean);

  // Check if first segment is a valid locale
  const { supportedLocales } = require('./translations');
  if (segments[0] && supportedLocales.includes(segments[0])) {
    return segments[0] as import('./translations').Locale;
  }

  return 'en';
}

// Helper to create localized URLs
export function localizeUrl(url: string, locale: import('./translations').Locale): string {
  if (locale === 'en') {
    return url; // Default locale doesn't need prefix
  }
  return `/${locale}${url}`;
}
