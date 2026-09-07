import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const container = process.env.LOCAL_SUPABASE_DB_CONTAINER ?? 'supabase_db_release-review';
assert.match(container, /^supabase_db_[a-zA-Z0-9_-]+$/, 'Use a local Supabase database container');
const ids = new Map();
const runId = randomUUID();
const remap = (sql) => sql.replace(/[def][1-6]000000-0000-0000-0000-00000000000[1-5]/g, (id) => {
  if (!ids.has(id)) ids.set(id, randomUUID());
  return ids.get(id);
});
const sql = (statement) => new Promise((resolve, reject) => {
  const child = execFile('docker', ['exec', '-i', container, 'psql', '-X', '-qAt', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1'],
    { maxBuffer: 2 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout.trim());
    });
  child.stdin.end(statement);
});

const fixture = await readFile(new URL('../supabase/tests/production_lifecycle.sql', import.meta.url), 'utf8');
const operationIds = Array.from({ length: 5 }, (_, index) => {
  const id = randomUUID();
  ids.set(`d5000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`, id);
  return `'${id}'`;
});
const setup = remap(fixture.slice(0, fixture.indexOf('SET LOCAL ROLE authenticated;')))
  .replace("('d5000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid", `(ARRAY[${operationIds.join(',')}]::uuid[])[n]`)
  .replace("'production@example.invalid'", `'production-${runId}@example.invalid'`)
  .replace("'other-production@example.invalid'", `'other-production-${runId}@example.invalid'`);
const operator = ids.get('d1000000-0000-0000-0000-000000000001');
const otherUser = ids.get('e1000000-0000-0000-0000-000000000001');
const operation = ids.get('d5000000-0000-0000-0000-000000000001');
const batch = ids.get('d6000000-0000-0000-0000-000000000001');
let tenant;
let otherTenant;
try {
  const output = await sql(`${setup}\nSELECT tenant_id FROM profiles WHERE id='${operator}'; COMMIT;`);
  tenant = output.split('\n').at(-1);
  assert.match(tenant, /^[a-f0-9-]{36}$/);
  otherTenant = await sql(`SELECT tenant_id FROM profiles WHERE id='${otherUser}';`);
  assert.match(otherTenant, /^[a-f0-9-]{36}$/);
  const authenticated = `BEGIN; SET LOCAL ROLE authenticated; SELECT set_config('request.jwt.claims','${JSON.stringify({ role: 'authenticated', sub: operator })}',true);`;
  const race = async (call) => {
    const results = await Promise.all([0, 1].map(() => sql(`${authenticated}\nSELECT ${call}; SELECT pg_sleep(0.1); COMMIT;`)));
    const values = results.map(result => result.split('\n').filter(line => line.startsWith('{')).map(JSON.parse).find(value => 'changed' in value));
    assert.deepEqual(values.map(value => value.changed).sort(), [false, true]);
  };
  await race(`transition_operation('${tenant}','${operation}','start','${operator}')`);
  assert.equal(await sql(`SELECT count(*) FROM time_entries WHERE operation_id='${operation}' AND end_time IS NULL;`), '1');
  await sql(`${authenticated}\nSELECT transition_operation('${tenant}','${operation}','finish','${operator}'); COMMIT;`);
  await race(`transition_batch('${tenant}','${batch}','start','${operator}')`);
  assert.equal(await sql(`SELECT count(*) FROM time_entries WHERE tenant_id='${tenant}' AND end_time IS NULL;`), '3');
  await race(`transition_batch('${tenant}','${batch}','stop','${operator}')`);
  assert.equal(await sql(`SELECT count(*) FROM time_entries WHERE tenant_id='${tenant}' AND end_time IS NULL;`), '0');
  console.log('PASS: concurrent operation start, batch start, and batch stop are idempotent');
} finally {
  if (tenant) {
    await sql(`BEGIN; DELETE FROM operation_batches WHERE tenant_id='${tenant}'; DELETE FROM time_entries WHERE tenant_id='${tenant}'; DELETE FROM jobs WHERE tenant_id='${tenant}'; DELETE FROM cells WHERE tenant_id='${tenant}'; DELETE FROM tenants WHERE id IN ('${tenant}','${otherTenant}'); DELETE FROM auth.users WHERE id IN ('${operator}','${otherUser}'); COMMIT;`);
    assert.equal(await sql(`SELECT count(*) FROM tenants WHERE id='${tenant}';`), '0');
    console.log('PASS: concurrency fixtures cleaned up');
  }
}
