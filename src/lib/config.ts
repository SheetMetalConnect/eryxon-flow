/**
 * Application Configuration
 *
 * External URLs and other configurable settings.
 * Self-hosters can override these via environment variables.
 */

// Documentation site URL - self-hosters can point to their own docs
export const DOCS_URL = import.meta.env.VITE_DOCS_URL || 'https://eryxon.eu';

// Convenience exports for common doc paths
export const DOCS_GUIDES_URL = `${DOCS_URL}/guides/`;
export const DOCS_ERP_INTEGRATION_URL = `${DOCS_URL}/features/erp-integration/`;
