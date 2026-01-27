import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const emailsToDelete = [
    'demo@eryxon.com',
    'verified_test@eryxon.com',
    'test@eryxon.com'
];

async function cleanup() {
    console.log('Cleaning up test users...');

    for (const email of emailsToDelete) {
        // List users to find the ID (admin API doesn't have getByEmail directly usually, or listUsers to search)
        // Actually listUsers supports filtering in some versions, but scanning is safer for small count
        const { data: { users }, error } = await supabase.auth.admin.listUsers();

        if (error) {
            console.error('Error listing users:', error);
            continue;
        }

        const user = users.find(u => u.email === email);

        if (user) {
            console.log(`Deleting user ${email} (${user.id})...`);
            const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
            if (deleteError) {
                console.error(`Error deleting ${email}:`, deleteError.message);
            } else {
                console.log(`Deleted ${email} successfully.`);
            }
        } else {
            console.log(`User ${email} not found, skipping.`);
        }
    }
}

cleanup();
