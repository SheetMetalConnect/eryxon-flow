import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
// Use direct connection (port 5432) instead of pooler (port 6543)
const connectionString = `postgres://postgres:${password}@db.gqptivvyklmxvdgivsmz.supabase.co:5432/postgres`;

const client = new pg.Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        console.log("Connecting to remote DB...");
        await client.connect();
        console.log("Connected. Dropping and recreating public schema...");

        await client.query('DROP SCHEMA IF EXISTS public CASCADE');
        await client.query('CREATE SCHEMA public');

        // Restore default Supabase permissions
        await client.query('GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role');
        await client.query('GRANT ALL ON SCHEMA public TO postgres');
        await client.query('GRANT ALL ON SCHEMA public TO service_role');
        // anon and authenticated usually rely on specific grants per table/function, which the migration will handle.

        console.log("Public schema reset successfully.");
    } catch (err) {
        console.error("Error resetting DB:", err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

if (!process.env.SUPABASE_DB_PASSWORD) {
    console.error("Please set SUPABASE_DB_PASSWORD environment variable.");
    process.exit(1);
}

run();
