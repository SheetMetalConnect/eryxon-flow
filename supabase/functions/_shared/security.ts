import { getRuntimeEnv } from "./runtime-env.ts";
/**
 * Security utilities for Edge Functions
 */

/**
 * Sanitize error messages to prevent information leakage
 */
export function sanitizeError(error: unknown): { code: string; message: string } {
  if (error instanceof Error) {
    // Don't expose internal error details
    // Only return generic messages for security
    const message = error.message;

    // Check for database errors (Postgres codes)
    if (message.includes('duplicate key') || message.includes('PGRST116')) {
      return { code: 'CONFLICT', message: 'Resource already exists or not found' };
    }

    if (message.includes('foreign key') || message.includes('violates')) {
      return { code: 'INVALID_REFERENCE', message: 'Invalid reference to related resource' };
    }

    if (message.includes('permission denied') || message.includes('RLS')) {
      return { code: 'FORBIDDEN', message: 'Insufficient permissions' };
    }

    // For other errors, return generic message
    // Log the real error server-side for debugging
    console.error('Sanitized error:', error);

    return { code: 'INTERNAL_ERROR', message: 'An internal error occurred' };
  }

  return { code: 'UNKNOWN_ERROR', message: 'An unknown error occurred' };
}

/**
 * Validate content type
 */
export function validateContentType(contentType: string): { valid: boolean; error?: string } {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/json',
    // CAD/manufacturing file types
    'application/step',
    'application/stp',
    'model/step',
    'application/octet-stream',
    'application/dxf',
    'image/vnd.dxf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];

  if (!allowedTypes.includes(contentType)) {
    return { valid: false, error: 'Content type not allowed' };
  }

  return { valid: true };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
export function constantTimeCompare(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  let result = a.length ^ b.length; // Include length difference in result
  for (let i = 0; i < maxLen; i++) {
    result |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return result === 0;
}

/**
 * Escape HTML to prevent injection in email templates
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
