import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config();

// Validate required environment variables
if (!process.env.SUPABASE_DB_PASSWORD && !process.env.DATABASE_URL) {
    console.error("Please set either DATABASE_URL or SUPABASE_DB_PASSWORD environment variable.");
    process.exit(1);
}
if (!process.env.DATABASE_URL && !process.env.VITE_SUPABASE_PROJECT_ID) {
    console.error("Please set VITE_SUPABASE_PROJECT_ID environment variable when not using DATABASE_URL.");
    process.exit(1);
}

// Encode password to handle special characters
const password = process.env.SUPABASE_DB_PASSWORD ? encodeURIComponent(process.env.SUPABASE_DB_PASSWORD) : '';
const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const connectionString = process.env.DATABASE_URL || `postgres://postgres.${projectId}:${password}@aws-0-eu-west-1.pooler.supabase.com:5432/postgres`;

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

run();
