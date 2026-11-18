import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const image = `ghcr.io/example/community@sha256:${'a'.repeat(64)}`;
const previous = `sha256:${'b'.repeat(64)}`;
function deploy(extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'eryxon-deploy-test-'));
  writeFileSync(join(dir, '.env'), 'VITE_SELF_HOSTED=true\n');
  writeFileSync(join(dir, 'docker'), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$DEPLOY_DIRECTORY/commands"
case "$*" in
  *'ps -q'*) if [ "\${NO_CURRENT:-}" != true ]; then echo previous-container; fi ;;
  inspect*) if [[ "$*" == *'{{.Image}}'* ]]; then echo "$PREVIOUS"; else echo ghcr.io/example/community:moved-tag; fi ;;
  *'config --images'*) echo "\${CONFIGURED_IMAGE:-$ERYXON_IMAGE}" ;;
  *'up -d'*) if [ "\${FAIL_ROLLBACK:-}" = true ]; then exit 1; fi; if [ "\${FAIL_HEALTH:-}" = true ] && [ "$ERYXON_IMAGE" != "$PREVIOUS" ]; then exit 1; fi ;;
esac
`, { mode: 0o755 });
  const result = spawnSync('bash', [resolve('scripts/deploy-image.sh')], {
    env: { ...process.env, PATH: `${dir}:${process.env.PATH}`, DEPLOY_DIRECTORY: dir, ERYXON_IMAGE: image, PREVIOUS: previous, ...extra },
    encoding: 'utf8',
  });
  return { dir, result, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

test('deploys and records exactly the selected digest', () => {
  const run = deploy();
  try {
    assert.equal(run.result.status, 0, run.result.stderr);
    assert.equal(readFileSync(join(run.dir, '.release-image.env'), 'utf8').trim(), `ERYXON_IMAGE=${image}`);
    assert.match(readFileSync(join(run.dir, 'commands'), 'utf8'), /up -d --wait/);
  } finally { run.cleanup(); }
});
test('restores the previous artifact when the new container is unhealthy', () => {
  const run = deploy({ FAIL_HEALTH: 'true' });
  try {
    assert.equal(run.result.status, 1);
    assert.equal(readFileSync(join(run.dir, '.release-image.env'), 'utf8').trim(), `ERYXON_IMAGE=${previous}`);
    assert.match(readFileSync(join(run.dir, 'commands'), 'utf8'), /--pull never/);
  } finally { run.cleanup(); }
});
test('rejects a server Compose file that ignores the selected image', () => {
  const run = deploy({ CONFIGURED_IMAGE: 'example/community:latest' });
  try {
    assert.equal(run.result.status, 1);
    assert.doesNotMatch(readFileSync(join(run.dir, 'commands'), 'utf8'), /pull /);
  } finally { run.cleanup(); }
});
test('rejects a mutable image reference before running Docker', () => {
  const run = deploy({ ERYXON_IMAGE: 'example/community:latest' });
  try { assert.equal(run.result.status, 1); assert.match(run.result.stderr, /immutable GHCR/); }
  finally { run.cleanup(); }
});

test('removes an unhealthy first deployment and its image state', () => {
  const run = deploy({ NO_CURRENT: 'true', FAIL_HEALTH: 'true' });
  try {
    assert.equal(run.result.status, 1);
    assert.equal(existsSync(join(run.dir, '.release-image.env')), false);
    assert.match(readFileSync(join(run.dir, 'commands'), 'utf8'), /rm --stop --force eryxon-flow/);
  } finally { run.cleanup(); }
});
test('reports a failed rollback instead of implying restoration succeeded', () => {
  const run = deploy({ FAIL_ROLLBACK: 'true' });
  try {
    assert.equal(run.result.status, 1);
    assert.match(run.result.stderr, /restoring the previous image also failed/);
    assert.equal(readFileSync(join(run.dir, '.release-image.env'), 'utf8').trim(), `ERYXON_IMAGE=${previous}`);
  } finally { run.cleanup(); }
});
