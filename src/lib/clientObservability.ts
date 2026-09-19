import { supabase } from '@/integrations/supabase/client';

function errorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) return undefined;
  return typeof error.code === 'string' ? error.code.slice(0, 80) : undefined;
}

export async function reportClientError(
  component: string,
  eventType: string,
  error?: unknown,
): Promise<void> {
  try {
    const { error: reportError } = await supabase.rpc('report_client_error', {
      p_component: component.slice(0, 80),
      p_event_type: eventType.slice(0, 80),
      p_error_code: errorCode(error),
      p_route: window.location.pathname.slice(0, 200),
    });
    if (reportError) console.warn('[ClientObservability] Could not report client error');
  } catch {
    console.warn('[ClientObservability] Could not report client error');
  }
}
