import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

type Catalog = Record<string, unknown>;

const isPlainObject = (v: unknown): v is Catalog =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

// Namespace files share top-level keys (e.g. `users` in admin.json and
// config.json), so they are deep-merged instead of overwritten.
const deepMerge = (target: Catalog, source: Catalog): Catalog => {
  for (const [key, value] of Object.entries(source)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    const existing = target[key];
    target[key] = isPlainObject(value) ? deepMerge(isPlainObject(existing) ? existing : {}, value) : value;
  }
  return target;
};

const mergeCatalogs = (files: Catalog[]) => files.reduce<Catalog>(deepMerge, {});

// English ships in the entry bundle; other languages load when selected.
const english = import.meta.glob<{ default: Catalog }>('./locales/en/*.json', { eager: true });
const lazyCatalogs = import.meta.glob<{ default: Catalog }>('./locales/*/*.json');

const backend = {
  type: 'backend' as const,
  init() {},
  read(lng: string, _ns: string, callback: (error: unknown, data?: Catalog) => void) {
    const loaders = Object.entries(lazyCatalogs)
      .filter(([path]) => path.includes(`/${lng}/`))
      .map(([, load]) => load());
    Promise.all(loaders)
      .then((modules) => callback(null, mergeCatalogs(modules.map((m) => m.default))))
      .catch(callback);
  },
};

i18n
  .use(LanguageDetector)
  .use(backend)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: mergeCatalogs(Object.values(english).map((m) => m.default)) } },
    partialBundledLanguages: true,
    load: 'currentOnly',
    fallbackLng: 'en',
    supportedLngs: ['en', 'nl', 'de'],
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'], lookupLocalStorage: 'i18nextLng' },
    react: { useSuspense: false },
  });

export default i18n;
