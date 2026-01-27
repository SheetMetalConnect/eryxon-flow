import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function listUsers() {
    console.log('Listing users...');
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (users.length === 0) {
        console.log('No users found in Supabase Auth.');
    } else {
        console.log(`Found ${users.length} users:`);
        users.forEach(u => {
            console.log(`- ${u.email} (ID: ${u.id})`);
        });
    }
}

listUsers();
