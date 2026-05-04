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
  validateFilename,
  validateContentType,
  validateWebhookUrl,
  validateInputLimits,
  capPaginationLimit,
  getClientIdentifier,
  constantTimeCompare,
  escapeHtml,
  getCorsHeaders,
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

describe('security — validateFilename', () => {
  it('accepts valid filenames', () => {
    expect(validateFilename('drawing.pdf')).toEqual({
      valid: true,
      sanitized: 'drawing.pdf',
    });
    expect(validateFilename('part-001_rev2.step')).toEqual({
      valid: true,
      sanitized: 'part-001_rev2.step',
    });
  });

  it('rejects empty filenames', () => {
    const result = validateFilename('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects filenames exceeding 255 characters', () => {
    const longName = 'a'.repeat(256) + '.pdf';
    const result = validateFilename(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('too long');
  });

  it('blocks path traversal with ..', () => {
    const result = validateFilename('../../../etc/passwd');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });

  it('blocks forward slashes', () => {
    const result = validateFilename('path/to/file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });

  it('blocks backslashes', () => {
    const result = validateFilename('path\\to\\file.pdf');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('invalid characters');
  });

  it('blocks dangerous extensions', () => {
    const dangerous = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.js', '.php', '.dll'];
    for (const ext of dangerous) {
      const result = validateFilename(`malicious${ext}`);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not allowed');
    }
  });

  it('blocks dangerous extensions case-insensitively', () => {
    const result = validateFilename('payload.EXE');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('not allowed');
  });

  it('sanitizes special characters in filenames', () => {
    const result = validateFilename('my file (copy) [v2].pdf');
    expect(result.valid).toBe(true);
    expect(result.sanitized).toBe('my_file__copy___v2_.pdf');
    expect(result.sanitized).not.toContain(' ');
    expect(result.sanitized).not.toContain('(');
  });

  it('allows manufacturing file extensions', () => {
    expect(validateFilename('part.step').valid).toBe(true);
    expect(validateFilename('drawing.dxf').valid).toBe(true);
    expect(validateFilename('report.pdf').valid).toBe(true);
    expect(validateFilename('data.csv').valid).toBe(true);
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

describe('security — validateWebhookUrl', () => {
  it('accepts valid HTTPS URLs', () => {
    expect(validateWebhookUrl('https://example.com/webhook').valid).toBe(true);
    expect(validateWebhookUrl('https://api.acme.com/v1/events').valid).toBe(true);
  });

  it('rejects HTTP URLs (must be HTTPS)', () => {
    const result = validateWebhookUrl('http://example.com/webhook');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('HTTPS');
  });

  it('rejects localhost URLs', () => {
    expect(validateWebhookUrl('https://localhost/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://localhost:3000/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://sub.localhost/webhook').valid).toBe(false);
  });

  it('rejects IPv4 loopback IPs', () => {
    expect(validateWebhookUrl('https://127.0.0.1/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://0.0.0.0/webhook').valid).toBe(false);
  });

  it('rejects IPv6 loopback [::1] (bracketed)', () => {
    expect(validateWebhookUrl('https://[::1]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://[::1]:8443/webhook').valid).toBe(false);
  });

  it('rejects expanded IPv6 loopback [0:0:0:0:0:0:0:1]', () => {
    expect(validateWebhookUrl('https://[0:0:0:0:0:0:0:1]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://[0000:0000:0000:0000:0000:0000:0000:0001]/webhook').valid).toBe(false);
  });

  it('rejects IPv4-mapped IPv6 loopback [::ffff:127.0.0.1]', () => {
    expect(validateWebhookUrl('https://[::ffff:127.0.0.1]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://[::ffff:127.0.0.2]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://[0:0:0:0:0:ffff:127.0.0.1]/webhook').valid).toBe(false);
  });

  it('rejects IPv4-mapped IPv6 private ranges', () => {
    expect(validateWebhookUrl('https://[::ffff:10.0.0.1]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://[::ffff:192.168.1.1]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://[::ffff:172.16.0.1]/webhook').valid).toBe(false);
  });

  it('rejects private IP ranges (10.x.x.x)', () => {
    expect(validateWebhookUrl('https://10.0.0.1/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://10.255.255.255/webhook').valid).toBe(false);
  });

  it('rejects private IP ranges (192.168.x.x)', () => {
    expect(validateWebhookUrl('https://192.168.1.1/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://192.168.0.100/webhook').valid).toBe(false);
  });

  it('rejects private IP ranges (172.16-31.x.x)', () => {
    expect(validateWebhookUrl('https://172.16.0.1/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://172.31.255.255/webhook').valid).toBe(false);
  });

  it('rejects cloud metadata service URLs', () => {
    expect(validateWebhookUrl('https://169.254.169.254/latest/meta-data/').valid).toBe(false);
    expect(validateWebhookUrl('https://metadata.google.internal/webhook').valid).toBe(false);
  });

  it('rejects IPv6 private ranges', () => {
    expect(validateWebhookUrl('https://[fc00::1]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://[fd12::1]/webhook').valid).toBe(false);
    expect(validateWebhookUrl('https://[fe80::1]/webhook').valid).toBe(false);
  });

  it('rejects invalid URL formats', () => {
    expect(validateWebhookUrl('not-a-url').valid).toBe(false);
    expect(validateWebhookUrl('').valid).toBe(false);
    expect(validateWebhookUrl('ftp://example.com/file').valid).toBe(false);
  });
});

describe('security — validateInputLimits', () => {
  it('accepts valid input within limits', () => {
    const result = validateInputLimits({
      jobNumber: 'JOB-001',
      partNumber: 'PART-A',
      taskName: 'Laser cutting',
      quantity: 100,
      estimatedTime: 60,
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts empty input (all fields optional)', () => {
    const result = validateInputLimits({});
    expect(result.valid).toBe(true);
  });

  it('rejects job number exceeding 100 characters', () => {
    const result = validateInputLimits({ jobNumber: 'X'.repeat(101) });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Job number too long (max 100 characters)');
  });

  it('rejects part number exceeding 100 characters', () => {
    const result = validateInputLimits({ partNumber: 'P'.repeat(101) });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Part number too long (max 100 characters)');
  });

  it('rejects task name exceeding 200 characters', () => {
    const result = validateInputLimits({ taskName: 'T'.repeat(201) });
    expect(result.valid).toBe(false);
  });

  it('rejects notes exceeding 5000 characters', () => {
    const result = validateInputLimits({ notes: 'N'.repeat(5001) });
    expect(result.valid).toBe(false);
  });

  it('rejects description exceeding 5000 characters', () => {
    const result = validateInputLimits({ description: 'D'.repeat(5001) });
    expect(result.valid).toBe(false);
  });

  it('rejects quantity less than 1', () => {
    const result = validateInputLimits({ quantity: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Quantity must be between');
  });

  it('rejects quantity exceeding 1,000,000', () => {
    const result = validateInputLimits({ quantity: 1_000_001 });
    expect(result.valid).toBe(false);
  });

  it('rejects negative estimated time', () => {
    const result = validateInputLimits({ estimatedTime: -1 });
    expect(result.valid).toBe(false);
  });

  it('rejects estimated time exceeding 100,000 minutes', () => {
    const result = validateInputLimits({ estimatedTime: 100_001 });
    expect(result.valid).toBe(false);
  });

  it('collects multiple validation errors', () => {
    const result = validateInputLimits({
      jobNumber: 'X'.repeat(101),
      quantity: -5,
      notes: 'N'.repeat(5001),
    });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(3);
  });
});

describe('security — capPaginationLimit', () => {
  it('returns the limit when within bounds', () => {
    expect(capPaginationLimit(50)).toBe(50);
    expect(capPaginationLimit(100)).toBe(100);
    expect(capPaginationLimit(500)).toBe(500);
  });

  it('returns default when limit is less than 1', () => {
    expect(capPaginationLimit(0)).toBe(100);
    expect(capPaginationLimit(-1)).toBe(100);
    expect(capPaginationLimit(-100)).toBe(100);
  });

  it('caps at maxLimit when exceeded', () => {
    expect(capPaginationLimit(1001)).toBe(1000);
    expect(capPaginationLimit(5000)).toBe(1000);
  });

  it('respects custom default and max limits', () => {
    expect(capPaginationLimit(0, 25, 200)).toBe(25);
    expect(capPaginationLimit(300, 25, 200)).toBe(200);
    expect(capPaginationLimit(150, 25, 200)).toBe(150);
  });
});

describe('security — getClientIdentifier', () => {
  it('returns truncated API key hash when provided', () => {
    const hash = 'abcdef1234567890abcdef1234567890';
    const req = new Request('https://api.example.com');
    expect(getClientIdentifier(req, hash)).toBe('abcdef1234567890');
  });

  it('returns x-forwarded-for IP when no API key', () => {
    const req = new Request('https://api.example.com', {
      headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' },
    });
    expect(getClientIdentifier(req)).toBe('203.0.113.50');
  });

  it('returns x-real-ip when no forwarded header', () => {
    const req = new Request('https://api.example.com', {
      headers: { 'x-real-ip': '203.0.113.50' },
    });
    expect(getClientIdentifier(req)).toBe('203.0.113.50');
  });

  it('returns "unknown" as last resort', () => {
    const req = new Request('https://api.example.com');
    expect(getClientIdentifier(req)).toBe('unknown');
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

describe('security — getCorsHeaders', () => {
  beforeEach(() => {
    mockDenoEnv.clear();
  });

  it('defaults to localhost:5173 when ALLOWED_ORIGIN is not set', () => {
    const headers = getCorsHeaders();
    expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('uses ALLOWED_ORIGIN env var when set', () => {
    mockDenoEnv.set('ALLOWED_ORIGIN', 'https://app.eryxon.com');
    const headers = getCorsHeaders();
    expect(headers['Access-Control-Allow-Origin']).toBe('https://app.eryxon.com');
  });

  it('includes security headers', () => {
    const headers = getCorsHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-XSS-Protection']).toBe('1; mode=block');
    expect(headers['Strict-Transport-Security']).toContain('max-age=');
  });

  it('allows required HTTP methods', () => {
    const headers = getCorsHeaders();
    const methods = headers['Access-Control-Allow-Methods'];
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('PATCH');
    expect(methods).toContain('DELETE');
    expect(methods).toContain('OPTIONS');
  });

  it('allows required headers', () => {
    const headers = getCorsHeaders();
    const allowed = headers['Access-Control-Allow-Headers'];
    expect(allowed).toContain('authorization');
    expect(allowed).toContain('content-type');
    expect(allowed).toContain('apikey');
  });
});
