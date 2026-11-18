-- Location tracking: default on (opt-out) instead of opt-in.
--
-- The placement / drop-off prompt (and Location tab) is gated by
-- tenants.location_tracking_enabled, which shipped DEFAULT false — so operators
-- never saw the prompt unless an admin found and flipped the toggle. Make it
-- available out of the box; shops that don't track physical locations can still
-- turn it off in Organization Settings.

ALTER TABLE public.tenants
  ALTER COLUMN location_tracking_enabled SET DEFAULT true;

-- Enable for existing tenants that still carry the old opt-in default.
UPDATE public.tenants
  SET location_tracking_enabled = true
  WHERE location_tracking_enabled IS DISTINCT FROM true;

COMMENT ON COLUMN public.tenants.location_tracking_enabled IS
  'Enables the location/placement module (operators pick a drop-off slot when reporting work done). Default on; opt-out per tenant.';
