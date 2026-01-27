import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config();

// Encode password to handle special characters
const password = encodeURIComponent(process.env.SUPABASE_DB_PASSWORD);
const connectionString = process.env.DATABASE_URL || `postgres://postgres.gqptivvyklmxvdgivsmz:${password}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;

const client = new pg.Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database.');

        const seedPath = path.join(__dirname, '..', 'supabase', 'seed.sql');
        if (fs.existsSync(seedPath)) {
            console.log(`Reading seed file: ${seedPath}`);
            const sql = fs.readFileSync(seedPath, 'utf8');
            console.log('Executing seed SQL...');
            await client.query(sql);
            console.log('Seed SQL applied successfully.');
        } else {
            console.error(`Seed file not found at ${seedPath}`);
        }

    } catch (err) {
        console.error('Error executing script:', err);
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
