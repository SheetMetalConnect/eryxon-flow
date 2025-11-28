-- Migration: Production Metrics Enhancement
-- Adds: multiple scrap reasons per quantity record

-- ============================================================================
-- 1. REJECTION TRACKING ENHANCEMENT
-- Allow multiple scrap reasons per quantity record via junction table
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.operation_quantity_scrap_reasons (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_quantity_id uuid NOT NULL REFERENCES public.operation_quantities(id) ON DELETE CASCADE,
    scrap_reason_id uuid NOT NULL REFERENCES public.scrap_reasons(id) ON DELETE RESTRICT,
    quantity integer NOT NULL DEFAULT 1,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),

    UNIQUE(operation_quantity_id, scrap_reason_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_op_qty_scrap_reasons_qty ON public.operation_quantity_scrap_reasons(operation_quantity_id);
CREATE INDEX IF NOT EXISTS idx_op_qty_scrap_reasons_reason ON public.operation_quantity_scrap_reasons(scrap_reason_id);

-- Enable RLS
ALTER TABLE public.operation_quantity_scrap_reasons ENABLE ROW LEVEL SECURITY;

-- RLS Policy via parent table
CREATE POLICY "op_qty_scrap_reasons_tenant_isolation" ON public.operation_quantity_scrap_reasons
    FOR ALL USING (
        operation_quantity_id IN (
            SELECT id FROM public.operation_quantities
            WHERE tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
        )
    );

CREATE POLICY "op_qty_scrap_reasons_service_role" ON public.operation_quantity_scrap_reasons
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.operation_quantity_scrap_reasons IS 'Junction table for multiple scrap reasons per operation quantity record';
COMMENT ON COLUMN public.operation_quantity_scrap_reasons.quantity IS 'Number of units scrapped for this specific reason';

-- ============================================================================
-- 2. FUNCTION: Get Detailed Scrap Analysis
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_operation_scrap_analysis(p_operation_id uuid)
RETURNS TABLE (
    scrap_reason_id uuid,
    scrap_reason_code text,
    scrap_reason_description text,
    scrap_reason_category text,
    total_quantity integer,
    occurrence_count integer,
    percentage_of_total numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_scrap integer;
BEGIN
    -- Get total scrap for percentage calculation
    SELECT COALESCE(SUM(quantity_scrap), 0)
    INTO v_total_scrap
    FROM public.operation_quantities
    WHERE operation_id = p_operation_id;

    RETURN QUERY
    SELECT
        sr.id as scrap_reason_id,
        sr.code as scrap_reason_code,
        sr.description as scrap_reason_description,
        sr.category as scrap_reason_category,
        COALESCE(SUM(oqsr.quantity), 0)::integer as total_quantity,
        COUNT(oqsr.id)::integer as occurrence_count,
        CASE WHEN v_total_scrap > 0
             THEN ROUND((COALESCE(SUM(oqsr.quantity), 0)::numeric / v_total_scrap * 100), 2)
             ELSE 0
        END as percentage_of_total
    FROM public.operation_quantity_scrap_reasons oqsr
    JOIN public.operation_quantities oq ON oq.id = oqsr.operation_quantity_id
    JOIN public.scrap_reasons sr ON sr.id = oqsr.scrap_reason_id
    WHERE oq.operation_id = p_operation_id
    GROUP BY sr.id, sr.code, sr.description, sr.category
    ORDER BY total_quantity DESC;
END;
$$;

COMMENT ON FUNCTION public.get_operation_scrap_analysis IS 'Get detailed scrap analysis with breakdown by reason for an operation';
