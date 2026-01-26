/**
 * Application Configuration
 *
 * External URLs and other configurable settings.
 * Self-hosters can override these via environment variables.
 */

// Documentation site URL - self-hosters can point to their own docs
export const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://eryxon.eu';

// Convenience exports for common doc paths (all point to root domain)
export const DOCS_GUIDES_URL = DOCS_URL;
export const DOCS_ERP_INTEGRATION_URL = DOCS_URL;
