import { describe, it, expect, beforeAll } from 'vitest';
import i18n from './index';

/**
 * Regression: `users` lives in BOTH admin.json and config.json. A shallow
 * Object.assign merge let config's partial block clobber admin's full block,
 * dropping 68 users.* keys (raw keys rendered on the admin Users page). The deep
 * merge must keep BOTH files' sub-keys.
 */
describe('i18n namespace deep-merge', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('en');
  });

  const resolves = (key: string) => i18n.t(key) !== key && i18n.t(key).length > 0;

  it('keeps users.* keys that admin.json owns (would be clobbered by a shallow merge)', () => {
    expect(resolves('users.title')).toBe(true);
    expect(resolves('users.manageUsers')).toBe(true);
    expect(resolves('users.createMachine')).toBe(true);
    expect(resolves('users.advancedOptions')).toBe(true);
  });

  it('also keeps users.* keys that config.json contributes', () => {
    expect(resolves('users.enterMachineId')).toBe(true);
    expect(resolves('users.enterMachineName')).toBe(true);
  });

  it('resolves the new locations.* module keys', () => {
    expect(resolves('locations.config.navTitle')).toBe(true);
  });

  it('resolves keys across all three languages', async () => {
    for (const lng of ['en', 'nl', 'de']) {
      await i18n.changeLanguage(lng);
      expect(i18n.t('users.title')).not.toBe('users.title');
    }
    await i18n.changeLanguage('en');
  });
});
