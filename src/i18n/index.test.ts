import fs from 'node:fs';
import path from 'node:path';
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

const localesDir = path.resolve(__dirname, 'locales');
const leafKeys = (obj: unknown, prefix = ''): string[] =>
  Object.entries(obj as Record<string, unknown>).flatMap(([k, v]) =>
    v && typeof v === 'object' ? leafKeys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
const readLocale = (lng: string, file: string) =>
  JSON.parse(fs.readFileSync(path.join(localesDir, lng, file), 'utf8'));

describe('i18n locale files', () => {
  const files = fs.readdirSync(path.join(localesDir, 'en'));

  it.each(files)('%s has the same keys in en, nl and de', (file) => {
    const en = leafKeys(readLocale('en', file)).sort();
    for (const lng of ['nl', 'de']) {
      const other = leafKeys(readLocale(lng, file)).sort();
      const missing = en.filter((k) => !other.includes(k));
      const extra = other.filter((k) => !en.includes(k));
      expect({ lng, missing, extra }).toEqual({ lng, missing: [], extra: [] });
    }
  });

  it('every static t("key") in src resolves in en', async () => {
    await i18n.changeLanguage('en');
    const srcDir = path.resolve(__dirname, '..');
    const walk = (dir: string): string[] =>
      fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(path.join(dir, e.name)) : /\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name) ? [path.join(dir, e.name)] : [],
      );
    const unresolved: string[] = [];
    for (const file of walk(srcDir)) {
      const src = fs.readFileSync(file, 'utf8');
      for (const [, key] of src.matchAll(/\bt\(\s*["']([^"'\n{}$]+)["']/g)) {
        if (!i18n.exists(key) && !i18n.exists(`${key}_other`)) unresolved.push(`${path.relative(srcDir, file)}: ${key}`);
      }
    }
    expect(unresolved).toEqual([]);
  });
});
