CREATE TABLE IF NOT EXISTS public.resource_cell_memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    cell_id uuid NOT NULL REFERENCES public.cells(id) ON DELETE CASCADE,
    is_primary boolean NOT NULL DEFAULT true,
    assigned_at timestamp with time zone NOT NULL DEFAULT now(),
    revoked_at timestamp with time zone,
    assigned_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_resource_cell_memberships_active_resource
    ON public.resource_cell_memberships (tenant_id, resource_id)
    WHERE revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_resource_cell_memberships_active_cell
    ON public.resource_cell_memberships (tenant_id, cell_id, resource_id)
    WHERE revoked_at IS NULL;

ALTER TABLE public.resource_cell_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resource_cell_memberships_tenant_all"
    ON public.resource_cell_memberships
    FOR ALL
    TO authenticated
    USING (tenant_id = public.get_user_tenant_id())
    WITH CHECK (tenant_id = public.get_user_tenant_id());
