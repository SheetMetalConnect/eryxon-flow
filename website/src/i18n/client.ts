// Client-side i18n runtime for dynamic translations
import { translations, type Locale, defaultLocale, supportedLocales } from './translations';

// Get current language from localStorage or default
export function getCurrentLocale(): Locale {
  if (typeof window === 'undefined') return defaultLocale;

  const stored = localStorage.getItem('eryxon-lang');
  if (stored && supportedLocales.includes(stored as Locale)) {
    return stored as Locale;
  }

  // Try browser language
  const browserLang = navigator.language.slice(0, 2) as Locale;
  if (supportedLocales.includes(browserLang)) {
    return browserLang;
  }

  return defaultLocale;
}

// Get nested value from object by dot-notation path
function getNestedValue(obj: any, path: string): string | undefined {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

// Translation function
export function t(key: string, locale?: Locale): string {
  const lang = locale || getCurrentLocale();
  const value = getNestedValue(translations[lang], key);

  if (value === undefined) {
    // Fallback to English
    const fallback = getNestedValue(translations[defaultLocale], key);
    return fallback || key;
  }

  return value;
}

// Apply translations to elements with data-i18n attribute
export function applyTranslations(locale?: Locale) {
  const lang = locale || getCurrentLocale();

  // Update elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (key) {
      const translation = t(key, lang);
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        (el as HTMLInputElement).placeholder = translation;
      } else {
        el.textContent = translation;
      }
    }
  });

  // Update elements with data-i18n-title attribute (for tooltips)
  document.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const key = el.getAttribute('data-i18n-title');
    if (key) {
      el.setAttribute('title', t(key, lang));
    }
  });

  // Update elements with data-i18n-aria attribute
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    if (key) {
      el.setAttribute('aria-label', t(key, lang));
    }
  });

  // Update document language
  document.documentElement.lang = lang;
}

// Initialize i18n on page load
export function initI18n() {
  if (typeof window === 'undefined') return;

  // Apply translations on load
  applyTranslations();

  // Listen for language changes
  window.addEventListener('languageChanged', (e: Event) => {
    const customEvent = e as CustomEvent;
    applyTranslations(customEvent.detail as Locale);
  });
}

// Export translations for direct access
export { translations, supportedLocales, defaultLocale };
export type { Locale };
