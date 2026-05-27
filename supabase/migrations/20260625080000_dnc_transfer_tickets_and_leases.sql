-- DNC Transfer Tickets and Lease Configuration
-- Adds the bridge claim/ticket runtime contract:
-- - Tickets track exclusive runtime sessions between the bridge and a transfer job
-- - Lease-based claiming prevents double-execution by multiple bridge instances
-- - Heartbeat mechanism detects and recovers from bridge failures
--
-- The dnc_transfer_tickets table replaces direct state transitions for bridge-
-- initiated operations. The bridge claims a job → gets a ticket → heartbeats
-- periodically → completes or fails the ticket.

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE public.dnc_transfer_ticket_status AS ENUM ('active', 'completed', 'failed', 'expired');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- DNC TRANSFER TICKETS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.dnc_transfer_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),

  -- Link to transfer job
  transfer_job_id UUID NOT NULL REFERENCES public.dnc_transfer_jobs(id) ON DELETE CASCADE,

  -- Bridge instance identity (unique bridge agent identifier)
  bridge_instance_id TEXT NOT NULL,

  -- Ticket lifecycle
  status public.dnc_transfer_ticket_status NOT NULL DEFAULT 'active',

  -- Timing and lease
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_heartbeat_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lease_duration_seconds INT NOT NULL DEFAULT 300,
  lease_expires_at TIMESTAMPTZ NOT NULL,

  -- Resolution
  completed_at TIMESTAMPTZ,
  error_message TEXT,

  -- Extensibility
  metadata JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for dnc_transfer_tickets
CREATE INDEX IF NOT EXISTS idx_dnc_ticket_tenant ON public.dnc_transfer_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dnc_ticket_job ON public.dnc_transfer_tickets(transfer_job_id);
CREATE INDEX IF NOT EXISTS idx_dnc_ticket_status ON public.dnc_transfer_tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dnc_ticket_bridge ON public.dnc_transfer_tickets(bridge_instance_id);
CREATE INDEX IF NOT EXISTS idx_dnc_ticket_active ON public.dnc_transfer_tickets(transfer_job_id) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_dnc_ticket_expires ON public.dnc_transfer_tickets(lease_expires_at) WHERE status = 'active';

COMMENT ON TABLE public.dnc_transfer_tickets IS 'DNC bridge transfer tickets — runtime sessions for exclusive bridge-to-machine transfer execution';
COMMENT ON COLUMN public.dnc_transfer_tickets.bridge_instance_id IS 'Unique identifier for the bridge agent instance that claimed this transfer';
COMMENT ON COLUMN public.dnc_transfer_tickets.lease_duration_seconds IS 'How long the lease is valid before it expires (default 5 minutes)';
COMMENT ON COLUMN public.dnc_transfer_tickets.lease_expires_at IS 'Calculated as claimed_at + lease_duration_seconds; extended by heartbeat';

-- ============================================
-- ADD LEASE CONFIG TO DNC TRANSFER JOBS
-- ============================================

ALTER TABLE public.dnc_transfer_jobs
  ADD COLUMN IF NOT EXISTS lease_duration_seconds INT NOT NULL DEFAULT 300;

COMMENT ON COLUMN public.dnc_transfer_jobs.lease_duration_seconds IS 'Default lease duration for tickets created for this transfer job';

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.dnc_transfer_tickets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view DNC tickets in their tenant"
    ON public.dnc_transfer_tickets FOR SELECT
    USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can create DNC tickets"
    ON public.dnc_transfer_tickets FOR INSERT
    WITH CHECK (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can update DNC tickets"
    ON public.dnc_transfer_tickets FOR UPDATE
    USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can delete DNC tickets"
    ON public.dnc_transfer_tickets FOR DELETE
    USING (tenant_id = (SELECT auth.jwt() ->> 'tenant_id')::UUID);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
