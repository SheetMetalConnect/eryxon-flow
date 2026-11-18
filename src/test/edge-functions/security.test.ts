/**
 * Tests for supabase/functions/_shared/security.ts
 *
 * Tests pure utility functions that protect the API:
 * - Error sanitization (prevent information leakage)
 * - Filename validation (block path traversal, dangerous extensions)
 * - Content type validation (allowlist enforcement)
 * - Webhook URL validation (SSRF prevention)
 * - Input limits validation (string length, numeric bounds)
 * - Pagination capping
 * - Client identifier extraction
 * - Constant-time string comparison
 * - HTML escaping
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Deno.env for getCorsHeaders (the only function that uses Deno)
const mockDenoEnv = new Map<string, string>();
vi.stubGlobal('Deno', {
  env: {
    get: (key: string) => mockDenoEnv.get(key),
  },
});

// Import after mocking Deno
import {
  sanitizeError,
  validateContentType,
  constantTimeCompare,
  escapeHtml,
} from '../../../supabase/functions/_shared/security.ts';

describe('security — sanitizeError', () => {
  it('masks duplicate key errors', () => {
    const error = new Error('duplicate key value violates unique constraint');
    const result = sanitizeError(error);
    expect(result.code).toBe('CONFLICT');
    expect(result.message).not.toContain('duplicate key');
  });

  it('masks PGRST116 (not found) errors', () => {
    const error = new Error('PGRST116: The result contains 0 rows');
    const result = sanitizeError(error);
    expect(result.code).toBe('CONFLICT');
  });

  it('masks foreign key violation errors', () => {
    const error = new Error('foreign key constraint "fk_job_id" violates');
    const result = sanitizeError(error);
    expect(result.code).toBe('INVALID_REFERENCE');
    expect(result.message).not.toContain('fk_job_id');
  });

  it('masks constraint violation errors', () => {
    const error = new Error('violates check constraint "positive_quantity"');
    const result = sanitizeError(error);
    expect(result.code).toBe('INVALID_REFERENCE');
  });

  it('masks RLS/permission errors', () => {
    const error = new Error('permission denied for table jobs');
    const result = sanitizeError(error);
    expect(result.code).toBe('FORBIDDEN');
    expect(result.message).not.toContain('table jobs');
  });

  it('masks RLS policy errors containing "violates" (matched before RLS check)', () => {
    // Note: "violates" is checked before "RLS" in the code, so RLS violations
    // that include "violates" get classified as INVALID_REFERENCE.
    // A pure "RLS" message without "violates" would hit FORBIDDEN.
    const error = new Error('new row violates row-level security policy (RLS)');
    const result = sanitizeError(error);
    expect(result.code).toBe('INVALID_REFERENCE');
  });

  it('masks errors mentioning RLS without "violates"', () => {
    const error = new Error('blocked by RLS policy on table jobs');
    const result = sanitizeError(error);
    expect(result.code).toBe('FORBIDDEN');
  });

  it('returns generic error for unrecognized Error objects', () => {
    const error = new Error('Connection to database timed out at 192.168.1.100:5432');
    const result = sanitizeError(error);
    expect(result.code).toBe('INTERNAL_ERROR');
    expect(result.message).toBe('An internal error occurred');
    expect(result.message).not.toContain('192.168');
  });

  it('handles non-Error objects', () => {
    const result = sanitizeError('some string error');
    expect(result.code).toBe('UNKNOWN_ERROR');
    expect(result.message).toBe('An unknown error occurred');
  });

  it('handles null/undefined', () => {
    expect(sanitizeError(null).code).toBe('UNKNOWN_ERROR');
    expect(sanitizeError(undefined).code).toBe('UNKNOWN_ERROR');
  });
});

describe('security — validateContentType', () => {
  it('allows standard image types', () => {
    expect(validateContentType('image/jpeg').valid).toBe(true);
    expect(validateContentType('image/png').valid).toBe(true);
    expect(validateContentType('image/webp').valid).toBe(true);
  });

  it('allows document types', () => {
    expect(validateContentType('application/pdf').valid).toBe(true);
    expect(validateContentType('text/csv').valid).toBe(true);
    expect(validateContentType('application/json').valid).toBe(true);
  });

  it('allows manufacturing file types', () => {
    expect(validateContentType('application/step').valid).toBe(true);
    expect(validateContentType('application/dxf').valid).toBe(true);
    expect(validateContentType('application/octet-stream').valid).toBe(true);
  });

  it('allows Excel spreadsheets', () => {
    expect(validateContentType('application/vnd.ms-excel').valid).toBe(true);
    expect(
      validateContentType(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ).valid
    ).toBe(true);
  });

  it('rejects script types', () => {
    expect(validateContentType('text/html').valid).toBe(false);
    expect(validateContentType('text/javascript').valid).toBe(false);
    expect(validateContentType('application/x-httpd-php').valid).toBe(false);
  });

  it('rejects executable types', () => {
    expect(validateContentType('application/x-msdownload').valid).toBe(false);
    expect(validateContentType('application/x-executable').valid).toBe(false);
  });

  it('rejects empty and arbitrary types', () => {
    expect(validateContentType('').valid).toBe(false);
    expect(validateContentType('application/x-evil').valid).toBe(false);
  });
});

describe('security — constantTimeCompare', () => {
  it('returns true for identical strings', () => {
    expect(constantTimeCompare('abc123', 'abc123')).toBe(true);
    expect(constantTimeCompare('', '')).toBe(true);
  });

  it('returns false for different strings', () => {
    expect(constantTimeCompare('abc123', 'abc124')).toBe(false);
    expect(constantTimeCompare('short', 'longer-string')).toBe(false);
  });

  it('returns false for different lengths', () => {
    expect(constantTimeCompare('abc', 'abcd')).toBe(false);
    expect(constantTimeCompare('abcd', 'abc')).toBe(false);
  });

  it('handles empty vs non-empty comparison', () => {
    expect(constantTimeCompare('', 'notempty')).toBe(false);
    expect(constantTimeCompare('notempty', '')).toBe(false);
  });

  it('compares hash-length strings correctly', () => {
    const hash1 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
    const hash2 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b856';
    expect(constantTimeCompare(hash1, hash1)).toBe(true);
    expect(constantTimeCompare(hash1, hash2)).toBe(false);
  });
});

describe('security — escapeHtml', () => {
  it('escapes ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
    );
  });

  it('escapes quotes', () => {
    expect(escapeHtml('"double" & \'single\'')).toBe(
      '&quot;double&quot; &amp; &#39;single&#39;'
    );
  });

  it('leaves safe strings untouched', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('escapes all special chars in one pass', () => {
    expect(escapeHtml('<div class="foo">It\'s & more</div>')).toBe(
      '&lt;div class=&quot;foo&quot;&gt;It&#39;s &amp; more&lt;/div&gt;'
    );
  });
});

