-- Migration: Production Metrics Enhancement
-- Adds: cycle time sampling, WvB notes, rejection tracking improvements

-- ============================================================================
-- 1. CYCLE TIME SAMPLES TABLE
-- For measuring cycle time of individual products based on multiple measurements
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cycle_time_samples (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    operation_id uuid NOT NULL REFERENCES public.operations(id) ON DELETE CASCADE,

    -- Measurement data
    sample_number integer NOT NULL DEFAULT 1,
    measured_time_seconds numeric NOT NULL,
    quantity_measured integer NOT NULL DEFAULT 1,

    -- Calculated cycle time per unit
    cycle_time_per_unit_seconds numeric GENERATED ALWAYS AS (
        CASE WHEN quantity_measured > 0
             THEN measured_time_seconds / quantity_measured
             ELSE measured_time_seconds
        END
    ) STORED,

    -- Context
    measurement_type text DEFAULT 'manual' CHECK (measurement_type IN ('manual', 'automated', 'estimated')),
    measured_by uuid REFERENCES public.profiles(id),
    notes text,
    metadata jsonb DEFAULT '{}',

    -- Timestamps
    measured_at timestamptz NOT NULL DEFAULT now(),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cycle_time_samples_tenant ON public.cycle_time_samples(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cycle_time_samples_operation ON public.cycle_time_samples(operation_id);
CREATE INDEX IF NOT EXISTS idx_cycle_time_samples_measured_at ON public.cycle_time_samples(measured_at DESC);

-- Enable RLS
ALTER TABLE public.cycle_time_samples ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "cycle_time_samples_tenant_isolation" ON public.cycle_time_samples
    FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "cycle_time_samples_service_role" ON public.cycle_time_samples
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Comments
COMMENT ON TABLE public.cycle_time_samples IS 'Cycle time measurements for operations, supports multiple samples per operation';
COMMENT ON COLUMN public.cycle_time_samples.sample_number IS 'Sequential sample number for this operation';
COMMENT ON COLUMN public.cycle_time_samples.measured_time_seconds IS 'Total measured time in seconds';
COMMENT ON COLUMN public.cycle_time_samples.quantity_measured IS 'Number of units produced during measurement';
COMMENT ON COLUMN public.cycle_time_samples.cycle_time_per_unit_seconds IS 'Calculated cycle time per unit in seconds';
COMMENT ON COLUMN public.cycle_time_samples.measurement_type IS 'How the measurement was taken: manual, automated, or estimated';

-- ============================================================================
-- 2. WORK INSTRUCTIONS ON OPERATIONS
-- Work instructions from planning/engineering for operators
-- ============================================================================

ALTER TABLE public.operations
ADD COLUMN IF NOT EXISTS work_instructions text;

COMMENT ON COLUMN public.operations.work_instructions IS 'Work instructions for this operation (from planning/engineering)';

-- ============================================================================
-- 3. REJECTION TRACKING ENHANCEMENT
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

-- Enable RLS (inherits from parent operation_quantities)
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
-- 4. FUNCTION: Calculate Average Cycle Time for Operation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_operation_cycle_time_stats(p_operation_id uuid)
RETURNS TABLE (
    sample_count integer,
    avg_cycle_time_seconds numeric,
    min_cycle_time_seconds numeric,
    max_cycle_time_seconds numeric,
    std_dev_seconds numeric,
    total_quantity_measured integer,
    last_measured_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(*)::integer as sample_count,
        ROUND(AVG(cycle_time_per_unit_seconds), 2) as avg_cycle_time_seconds,
        ROUND(MIN(cycle_time_per_unit_seconds), 2) as min_cycle_time_seconds,
        ROUND(MAX(cycle_time_per_unit_seconds), 2) as max_cycle_time_seconds,
        ROUND(STDDEV(cycle_time_per_unit_seconds), 2) as std_dev_seconds,
        SUM(quantity_measured)::integer as total_quantity_measured,
        MAX(measured_at) as last_measured_at
    FROM public.cycle_time_samples
    WHERE operation_id = p_operation_id;
END;
$$;

COMMENT ON FUNCTION public.get_operation_cycle_time_stats IS 'Get statistical cycle time data for an operation based on samples';

-- ============================================================================
-- 5. FUNCTION: Get Detailed Scrap Analysis
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

-- ============================================================================
-- 6. UPDATE TRIGGER FOR cycle_time_samples
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_cycle_time_samples_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_cycle_time_samples_updated_at ON public.cycle_time_samples;
CREATE TRIGGER trigger_cycle_time_samples_updated_at
    BEFORE UPDATE ON public.cycle_time_samples
    FOR EACH ROW
    EXECUTE FUNCTION public.update_cycle_time_samples_updated_at();

-- ============================================================================
-- 7. AUTO-INCREMENT SAMPLE NUMBER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_increment_sample_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.sample_number IS NULL OR NEW.sample_number = 1 THEN
        SELECT COALESCE(MAX(sample_number), 0) + 1
        INTO NEW.sample_number
        FROM public.cycle_time_samples
        WHERE operation_id = NEW.operation_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_sample_number ON public.cycle_time_samples;
CREATE TRIGGER trigger_auto_sample_number
    BEFORE INSERT ON public.cycle_time_samples
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_increment_sample_number();
