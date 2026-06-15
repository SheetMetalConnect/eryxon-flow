/**
 * Regression test for issue #909.
 *
 * POST /api-webhooks used to 500 with a NOT NULL violation when secret_key
 * (or url / events) was missing, because the handler had no validator. The
 * WebhookValidator now turns those into a clean 422, matching the other CRUD
 * validators (e.g. IssueValidator).
 */

import { describe, it, expect } from 'vitest';
import { WebhookValidator } from '../../../supabase/functions/_shared/validation/validators/WebhookValidator.ts';

const ctx = {} as never; // WebhookValidator does not use ValidationContext

describe('WebhookValidator (issue #909)', () => {
  it('rejects a missing secret_key with a 422 (not a 500 pass-through)', () => {
    const result = new WebhookValidator().validate(
      { url: 'https://example.com/hook', events: ['job.created'] } as never,
      ctx,
    );
    expect(result.valid).toBe(false);
    expect(result.httpStatus).toBe(422);
    const fields = result.errors.map((e) => e.field);
    expect(fields).toContain('secret_key');
    const secretErr = result.errors.find((e) => e.field === 'secret_key');
    expect(secretErr?.constraint).toBe('NOT_NULL');
  });

  it('rejects a missing url and missing events too', () => {
    const result = new WebhookValidator().validate(
      { secret_key: 'whsec_abc123' } as never,
      ctx,
    );
    expect(result.valid).toBe(false);
    expect(result.httpStatus).toBe(422);
    const fields = result.errors.map((e) => e.field);
    expect(fields).toContain('url');
    expect(fields).toContain('events');
  });

  it('rejects a non-http url', () => {
    const result = new WebhookValidator().validate(
      { url: 'ftp://example.com', events: ['job.created'], secret_key: 'whsec_abc123' } as never,
      ctx,
    );
    expect(result.valid).toBe(false);
    const urlErr = result.errors.find((e) => e.field === 'url');
    expect(urlErr?.constraint).toBe('PATTERN_MISMATCH');
  });

  it('rejects an empty events array', () => {
    const result = new WebhookValidator().validate(
      { url: 'https://example.com/hook', events: [], secret_key: 'whsec_abc123' } as never,
      ctx,
    );
    expect(result.valid).toBe(false);
    const eventsErr = result.errors.find((e) => e.field === 'events');
    expect(eventsErr?.constraint).toBe('MIN_LENGTH');
  });

  it('accepts a complete, valid webhook payload', () => {
    const result = new WebhookValidator().validate(
      {
        url: 'https://example.com/hook',
        events: ['job.created', 'batch.completed'],
        secret_key: 'whsec_abc123',
        active: true,
      } as never,
      ctx,
    );
    expect(result.valid).toBe(true);
    expect(result.httpStatus).toBe(200);
    expect(result.errors).toHaveLength(0);
  });
});
