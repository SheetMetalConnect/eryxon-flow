import { describe, expect, it } from 'vitest';
import { resolveAuthorizedPrivateObjectPath } from '../../../supabase/functions/_shared/private-storage';

describe('private object authorization', () => {
  it('requires both same tenant prefix and stored record ownership', () => {
    expect(resolveAuthorizedPrivateObjectPath(['tenant/a.step'], 'tenant/a.step', 'tenant', 'parts-cad')).toBe('tenant/a.step');
    expect(resolveAuthorizedPrivateObjectPath(['other/a.step'], 'other/a.step', 'tenant', 'parts-cad')).toBeNull();
    expect(resolveAuthorizedPrivateObjectPath(['tenant/a.step'], 'tenant/b.step', 'tenant', 'parts-cad')).toBeNull();
  });
  it('normalizes stored storage URLs without trusting a different bucket', () => {
    const path = 'https://storage.example.test/storage/v1/object/sign/parts-cad/tenant/a.step?token=test';
    expect(resolveAuthorizedPrivateObjectPath([path], 'tenant/a.step', 'tenant', 'parts-cad')).toBe('tenant/a.step');
    expect(resolveAuthorizedPrivateObjectPath([path], 'tenant/a.step', 'tenant', 'parts-images')).toBeNull();
  });
  it.each(['tenant/../other/file', 'tenant/%2e%2e/other/file', 'tenant/\\other/file', 'tenant//file'])('rejects path traversal %s', path => {
    expect(resolveAuthorizedPrivateObjectPath([path], path, 'tenant', 'parts-cad')).toBeNull();
  });
});
