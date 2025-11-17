-- Add pause tracking for time entries
CREATE TABLE IF NOT EXISTS public.time_entry_pauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES time_entries(id) ON DELETE CASCADE,
  paused_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resumed_at TIMESTAMPTZ,
  duration INTEGER, -- Duration of pause in seconds
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.time_entry_pauses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for time_entry_pauses
CREATE POLICY "Users can view their own pauses"
  ON public.time_entry_pauses
  FOR SELECT
  USING (
    time_entry_id IN (
      SELECT id FROM time_entries WHERE operator_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own pauses"
  ON public.time_entry_pauses
  FOR INSERT
  WITH CHECK (
    time_entry_id IN (
      SELECT id FROM time_entries WHERE operator_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own pauses"
  ON public.time_entry_pauses
  FOR UPDATE
  USING (
    time_entry_id IN (
      SELECT id FROM time_entries WHERE operator_id = auth.uid()
    )
  );

-- Add is_paused flag to time_entries for quick lookup
ALTER TABLE public.time_entries
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_time_entry_pauses_time_entry_id
  ON public.time_entry_pauses(time_entry_id);

CREATE INDEX IF NOT EXISTS idx_time_entry_pauses_resumed_at
  ON public.time_entry_pauses(resumed_at)
  WHERE resumed_at IS NULL;
