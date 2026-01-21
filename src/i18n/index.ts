import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English namespace imports
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNavigation from './locales/en/navigation.json';
import enAdmin from './locales/en/admin.json';
import enOperator from './locales/en/operator.json';
import enJobs from './locales/en/jobs.json';
import enConfig from './locales/en/config.json';
import enIntegrations from './locales/en/integrations.json';
import enShipping from './locales/en/shipping.json';

// Dutch namespace imports
import nlCommon from './locales/nl/common.json';
import nlAuth from './locales/nl/auth.json';
import nlNavigation from './locales/nl/navigation.json';
import nlAdmin from './locales/nl/admin.json';
import nlOperator from './locales/nl/operator.json';
import nlJobs from './locales/nl/jobs.json';
import nlConfig from './locales/nl/config.json';
import nlIntegrations from './locales/nl/integrations.json';
import nlShipping from './locales/nl/shipping.json';

// German namespace imports
import deCommon from './locales/de/common.json';
import deAuth from './locales/de/auth.json';
import deNavigation from './locales/de/navigation.json';
import deAdmin from './locales/de/admin.json';
import deOperator from './locales/de/operator.json';
import deJobs from './locales/de/jobs.json';
import deConfig from './locales/de/config.json';
import deIntegrations from './locales/de/integrations.json';
import deShipping from './locales/de/shipping.json';

/**
 * i18n Namespace Structure
 *
 * Translations are split into logical namespaces for better maintainability:
 *
 * - common: Shared strings (Actions, Cancel, Status, forms, notifications, modals, time)
 * - auth: Authentication, legal, onboarding, subscription
 * - navigation: Sidebar and navigation items
 * - admin: Admin pages (dashboard, settings, users, activity)
 * - operator: Operator terminal (workQueue, terminal, session tracking)
 * - jobs: Jobs, parts, operations, issues
 * - config: Configuration (stages, materials, resources, assignments)
 * - integrations: API keys, webhooks, MQTT, data import/export
 * - shipping: Shipping module
 *
 * AI agents should edit individual namespace files rather than the monolithic translation.json
 */

// Merge all namespaces into a single translation object for backward compatibility
const mergeNamespaces = (...namespaces: Record<string, unknown>[]) =>
  Object.assign({}, ...namespaces);

const resources = {
  en: {
    translation: mergeNamespaces(
      enCommon,
      enAuth,
      enNavigation,
      enAdmin,
      enOperator,
      enJobs,
      enConfig,
      enIntegrations,
      enShipping
    ),
    // Also expose individual namespaces for future use
    common: enCommon,
    auth: enAuth,
    navigation: enNavigation,
    admin: enAdmin,
    operator: enOperator,
    jobs: enJobs,
    config: enConfig,
    integrations: enIntegrations,
    shipping: enShipping,
  },
  nl: {
    translation: mergeNamespaces(
      nlCommon,
      nlAuth,
      nlNavigation,
      nlAdmin,
      nlOperator,
      nlJobs,
      nlConfig,
      nlIntegrations,
      nlShipping
    ),
    common: nlCommon,
    auth: nlAuth,
    navigation: nlNavigation,
    admin: nlAdmin,
    operator: nlOperator,
    jobs: nlJobs,
    config: nlConfig,
    integrations: nlIntegrations,
    shipping: nlShipping,
  },
  de: {
    translation: mergeNamespaces(
      deCommon,
      deAuth,
      deNavigation,
      deAdmin,
      deOperator,
      deJobs,
      deConfig,
      deIntegrations,
      deShipping
    ),
    common: deCommon,
    auth: deAuth,
    navigation: deNavigation,
    admin: deAdmin,
    operator: deOperator,
    jobs: deJobs,
    config: deConfig,
    integrations: deIntegrations,
    shipping: deShipping,
  },
};

i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n instance to react-i18next
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'nl', 'de'],
    defaultNS: 'translation',
    ns: [
      'translation',
      'common',
      'auth',
      'navigation',
      'admin',
      'operator',
      'jobs',
      'config',
      'integrations',
      'shipping',
    ],

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    react: {
      useSuspense: false,
    },
  });

export default i18n;
