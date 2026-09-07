import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { runInNewContext } from 'node:vm';

const html = `<html><head><meta http-equiv="Content-Security-Policy" content="default-src 'self'; connect-src 'self' https://*.supabase.co; img-src 'self' data:; script-src 'self';" /></head></html>`;
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'eryxon-runtime-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const template = join(dir, 'template.html');
  writeFileSync(template, html);
  const render = (variables = {}) => spawnSync('sh', [resolve('docker-runtime-config.sh'), template, dir], {
    encoding: 'utf8', env: { PATH: process.env.PATH, ...variables },
  });
  return { dir, render };
}
for (const [url, httpOrigin, wsOrigin] of [
  ['https://supabase.example.test:8443/', 'https://supabase.example.test:8443', 'wss://supabase.example.test:8443'],
  ['http://192.0.2.20:54321', 'http://192.0.2.20:54321', 'ws://192.0.2.20:54321'],
]) test(`allows only the configured HTTP and WebSocket origins: ${url}`, t => {
  const { dir, render } = fixture(t);
  const result = render({ VITE_SUPABASE_URL: url });
  assert.equal(result.status, 0, result.stderr);
  const rendered = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.ok(rendered.includes(`connect-src 'self' https://*.supabase.co ${httpOrigin} ${wsOrigin};`));
  assert.ok(rendered.includes(`img-src 'self' data: ${httpOrigin};`));
  assert.ok(rendered.includes("script-src 'self';"));
  assert.ok(!rendered.includes('connect-src *'));
});
test('serializes public runtime settings as data, including quotes, backslashes and newlines', t => {
  const { dir, render } = fixture(t);
  const title = '!#$@= Workshop "A"\\line\nnext\trow\u2028end';
  assert.equal(render({ VITE_APP_TITLE: title, BACKEND_SECRET: 'must-not-ship' }).status, 0);
  const context = { window: {} };
  runInNewContext(readFileSync(join(dir, 'env.js'), 'utf8'), context);
  assert.equal(context.window.__ERYXON_ENV__.VITE_APP_TITLE, title);
  assert.equal(context.window.__ERYXON_ENV__.BACKEND_SECRET, undefined);
  assert.equal(readFileSync(join(dir, 'index.html'), 'utf8'), html);
});
test('restarts from the pristine template without keeping the old deployment origin', t => {
  const { dir, render } = fixture(t);
  assert.equal(render({ VITE_SUPABASE_URL: 'https://first.example.test' }).status, 0);
  assert.equal(render({ VITE_SUPABASE_URL: 'http://second.example.test:8080' }).status, 0);
  const rendered = readFileSync(join(dir, 'index.html'), 'utf8');
  assert.ok(!rendered.includes('first.example.test'));
  assert.ok(rendered.includes('ws://second.example.test:8080'));
});
for (const url of ['javascript:alert(1)', 'https://example.test"; script-src *', 'https://user:pass@example.test', 'https://example.test\nhttps://evil.test', 'https://example.test:99999', 'http://[::1]:54321', 'https://invalid..test', 'https://example.test\n']) {
  test(`rejects unsafe or invalid URLs before publishing runtime files: ${JSON.stringify(url)}`, t => {
    const { dir, render } = fixture(t);
    const result = render({ VITE_SUPABASE_URL: url });
    assert.notEqual(result.status, 0);
    assert.equal(existsSync(join(dir, 'env.js')), false);
    assert.equal(existsSync(join(dir, 'index.html')), false);
  });
}
test('fails closed if a future build omits the CSP template', t => {
  const { dir, render } = fixture(t);
  writeFileSync(join(dir, 'template.html'), '<html><head></head></html>');
  assert.notEqual(render({ VITE_SUPABASE_URL: 'https://supabase.example.test' }).status, 0);
  assert.equal(existsSync(join(dir, 'env.js')), false);
});
