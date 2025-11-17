-- Fix username constraint to be tenant-scoped instead of global
-- This allows multiple tenants to have the same username

-- Drop the global unique constraint on username
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_key;

-- Add a composite unique constraint on (tenant_id, username)
-- This ensures username is unique within each tenant, but not globally
ALTER TABLE public.profiles ADD CONSTRAINT profiles_tenant_username_key 
  UNIQUE (tenant_id, username);

-- Now multiple tenants can have "admin", "office", etc. as usernames