import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

function check({ version = '0.10.0', lockVersion = version, rootVersion = version, changelog = '## [0.10.0]\n\nCurrent notes.\n\n## [0.9.2]\nOld notes.' } = {}, args = []) {
  const dir = mkdtempSync(join(tmpdir(), 'eryxon-release-check-'));
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ version }));
    writeFileSync(join(dir, 'package-lock.json'), JSON.stringify({ version: lockVersion, packages: { '': { version: rootVersion } } }));
    writeFileSync(join(dir, 'CHANGELOG.md'), changelog);
    return spawnSync(process.execPath, [resolve('scripts/check-release.mjs'), ...args], { cwd: dir, encoding: 'utf8' });
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test('selects only the release version notes', () => {
  const result = check({}, ['--notes']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /Current notes/);
  assert.doesNotMatch(result.stdout, /Old notes/);
});
for (const fixture of [
  { lockVersion: '0.9.2' },
  { rootVersion: '0.9.2' },
  { version: '0.10.0-rc.1' },
  { changelog: '## [0.9.2]\nOld notes.' },
]) test(`rejects inconsistent release metadata ${JSON.stringify(fixture)}`, () => {
  assert.notEqual(check(fixture).status, 0);
});
