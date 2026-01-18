-- Create a default tenant for the fresh install
-- Users should register via the normal signup flow at http://localhost:54323
INSERT INTO public.tenants (id, name, status, plan)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Demo Tenant',
    'active',
    'free'
) ON CONFLICT DO NOTHING;
