-- Fix abbreviations for known tenants
UPDATE public.tenants SET abbreviation = 'SMC' WHERE id = '11111111-1111-1111-1111-111111111111';
UPDATE public.tenants SET abbreviation = 'ST' WHERE id = 'e2ef389e-731a-4ebf-b3b3-42da6632c076';