import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync('scripts/configure-webhook-vault.mjs', 'utf8').replace("import pg from 'pg';", '');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

describe('webhook Vault bootstrap', () => {
  it.each([false, true])('upserts runtime values with parameters (existing=%s) without logging secrets', async existing => {
    const query = vi.fn(async () => ({ rows: existing ? [{ id: 'entry-id' }] : [] }));
    const client = { connect: vi.fn(), query, end: vi.fn() };
    const log = { log: vi.fn(), error: vi.fn() };
    const process = { env: { DATABASE_URL: 'test-db-private', WEBHOOK_PROJECT_URL: 'https://dispatch.example.invalid/', INTERNAL_SERVICE_SECRET: 'test-private-secret' } };
    await new AsyncFunction('pg', 'process', 'console', source)({ Client: class { constructor() { return client; } } }, process, log);
    expect(query).toHaveBeenCalledWith(existing ? 'SELECT vault.update_secret($1::uuid, $2::text)' : 'SELECT vault.create_secret($1::text, $2::text)',
      existing ? ['entry-id', 'test-private-secret'] : ['test-private-secret', 'internal_service_secret']);
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(JSON.stringify(log.log.mock.calls)).not.toContain('test-private-secret');
    expect(log.error).not.toHaveBeenCalled();
  });

  it('rolls back and hides database errors that may contain private parameters', async () => {
    const query = vi.fn().mockRejectedValue(new Error('test-private-secret'));
    const client = { connect: vi.fn(), query, end: vi.fn() };
    const log = { log: vi.fn(), error: vi.fn() };
    const process = { env: { DATABASE_URL: 'test-db-private', WEBHOOK_PROJECT_URL: 'https://dispatch.example.invalid', INTERNAL_SERVICE_SECRET: 'test-private-secret' }, exitCode: 0 };
    await new AsyncFunction('pg', 'process', 'console', source)({ Client: class { constructor() { return client; } } }, process, log);
    expect(process.exitCode).toBe(1);
    expect(query).toHaveBeenCalledWith('ROLLBACK');
    expect(JSON.stringify(log.error.mock.calls)).not.toContain('test-private-secret');
  });
});
