-- Create the new tenant "Veluw Metal Creations"
INSERT INTO public.tenants (id, name, company_name, plan, status)
VALUES (
  gen_random_uuid(),
  'Veluw Metal Creations',
  'Veluw Metal Creations',
  'free',
  'trial'
)
RETURNING id;

-- Note: g.hout@vmc.eu will need to be invited via the invitation system
-- since they need to create an auth.users account first