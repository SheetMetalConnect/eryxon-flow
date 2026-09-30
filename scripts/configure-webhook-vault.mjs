import pg from 'pg';

const { DATABASE_URL, WEBHOOK_PROJECT_URL, INTERNAL_SERVICE_SECRET } = process.env;
if (!DATABASE_URL || !WEBHOOK_PROJECT_URL || !INTERNAL_SERVICE_SECRET) {
  console.error('Set DATABASE_URL, WEBHOOK_PROJECT_URL and INTERNAL_SERVICE_SECRET in the runtime environment.');
  process.exit(1);
}

let client;
try {
  const url = new URL(WEBHOOK_PROJECT_URL);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('Invalid project URL');
  }
  client = new pg.Client({ connectionString: DATABASE_URL });
  await client.connect();
  await client.query('BEGIN');
  for (const [name, value] of [
    ['project_url', WEBHOOK_PROJECT_URL.replace(/\/+$/, '')],
    ['internal_service_secret', INTERNAL_SERVICE_SECRET],
  ]) {
    const { rows } = await client.query('SELECT id FROM vault.secrets WHERE name = $1', [name]);
    if (rows.length > 1) throw new Error('Duplicate Vault entry');
    if (rows.length) {
      await client.query('SELECT vault.update_secret($1::uuid, $2::text)', [rows[0].id, value]);
    } else {
      await client.query('SELECT vault.create_secret($1::text, $2::text)', [value, name]);
    }
  }
  await client.query('COMMIT');
  console.log('Webhook Vault configuration saved. Ensure the Edge runtime uses the same INTERNAL_SERVICE_SECRET.');
} catch {
  await client?.query('ROLLBACK').catch(() => {});
  // Database errors can include connection details or query parameters.
  console.error('Webhook Vault configuration failed. Check environment values, connectivity and Vault permissions.');
  process.exitCode = 1;
} finally {
  await client?.end();
}
