-- Create notifications table for interactive notification system
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL CHECK (type IN ('issue', 'job_due', 'new_part', 'new_user', 'assignment', 'part_completed', 'operation_completed', 'system')),
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('high', 'medium', 'low')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,

  -- Reference to source entity
  reference_type TEXT CHECK (reference_type IN ('issue', 'job', 'part', 'user', 'assignment', 'operation')),
  reference_id UUID,

  -- Interactive states
  read BOOLEAN NOT NULL DEFAULT false,
  pinned BOOLEAN NOT NULL DEFAULT false,
  dismissed BOOLEAN NOT NULL DEFAULT false,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  pinned_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add indexes for better query performance
CREATE INDEX idx_notifications_tenant_id ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_type ON public.notifications(type);
CREATE INDEX idx_notifications_read ON public.notifications(read);
CREATE INDEX idx_notifications_pinned ON public.notifications(pinned);
CREATE INDEX idx_notifications_dismissed ON public.notifications(dismissed);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_reference ON public.notifications(reference_type, reference_id);

-- Enable Row Level Security
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notifications
-- Users can only see notifications for their tenant and (if user_id is set) for themselves
CREATE POLICY "Users can view their tenant's notifications"
  ON public.notifications
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      user_id IS NULL OR user_id = auth.uid()
    )
  );

-- Users can insert notifications for their tenant
CREATE POLICY "Users can create notifications for their tenant"
  ON public.notifications
  FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Users can update their own notifications (mark as read, pin, dismiss)
CREATE POLICY "Users can update their notifications"
  ON public.notifications
  FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
    AND (
      user_id IS NULL OR user_id = auth.uid()
    )
  )
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- Only admins can delete notifications
CREATE POLICY "Admins can delete notifications"
  ON public.notifications
  FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to automatically create notification
CREATE OR REPLACE FUNCTION public.create_notification(
  p_tenant_id UUID,
  p_user_id UUID,
  p_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (
    tenant_id,
    user_id,
    type,
    severity,
    title,
    message,
    link,
    reference_type,
    reference_id,
    metadata
  )
  VALUES (
    p_tenant_id,
    p_user_id,
    p_type,
    p_severity,
    p_title,
    p_message,
    p_link,
    p_reference_type,
    p_reference_id,
    p_metadata
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.create_notification TO authenticated;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE id = p_notification_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_notification_read TO authenticated;

-- Function to toggle notification pin
CREATE OR REPLACE FUNCTION public.toggle_notification_pin(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pinned BOOLEAN;
BEGIN
  UPDATE public.notifications
  SET
    pinned = NOT pinned,
    pinned_at = CASE WHEN NOT pinned THEN now() ELSE NULL END
  WHERE id = p_notification_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
  RETURNING pinned INTO v_pinned;

  RETURN v_pinned;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_notification_pin TO authenticated;

-- Function to dismiss notification
CREATE OR REPLACE FUNCTION public.dismiss_notification(p_notification_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.notifications
  SET dismissed = true, dismissed_at = now()
  WHERE id = p_notification_id
    AND tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid());
END;
$$;

GRANT EXECUTE ON FUNCTION public.dismiss_notification TO authenticated;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.notifications
  SET read = true, read_at = now()
  WHERE tenant_id IN (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
    AND (user_id IS NULL OR user_id = auth.uid())
    AND read = false
    AND dismissed = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read TO authenticated;

-- Add notifications to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Comment on table
COMMENT ON TABLE public.notifications IS 'Stores user notifications with support for read/pin/dismiss states';
