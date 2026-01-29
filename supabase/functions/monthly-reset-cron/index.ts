import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "@supabase/supabase-js";

/**
 * Monthly Parts Counter Reset Cron Job
 *
 * This edge function is designed to be called by Supabase's cron scheduler
 * on the 1st of each month to reset the current_month_parts counter for all tenants.
 *
 * Cron Schedule: 0 0 1 * *  (At 00:00 on day 1 of every month)
 *
 * Security:
 * - Only callable with the cron secret or service role key
 * - Validates the cron secret from request headers
 *
 * How to configure in Supabase:
 * 1. Go to Edge Functions in Supabase Dashboard
 * 2. Select this function
 * 3. Set up a cron trigger with schedule: "0 0 1 * *"
 * 4. Or use pg_cron in the database directly
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
};

/**
 * Authenticate the cron job request
 * Accepts either:
 * 1. X-Cron-Secret header matching CRON_SECRET env var
 * 2. Service role key in Authorization header
 */
function authenticateCron(req: Request): boolean {
  // Check for cron secret
  const cronSecret = req.headers.get('x-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');

  if (cronSecret && expectedSecret && cronSecret === expectedSecret) {
    return true;
  }

  // Check for service role key
  const authHeader = req.headers.get('authorization');
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY");

  if (authHeader && serviceRoleKey) {
    const token = authHeader.replace('Bearer ', '');
    return token === serviceRoleKey;
  }

  return false;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({
        success: false,
        error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are allowed' }
      }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Authenticate the request
  if (!authenticateCron(req)) {
    console.error('Unauthorized cron request attempt');
    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid cron secret or service role key'
        }
      }),
      {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Create Supabase client with service role
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_KEY") ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('Starting monthly parts counter reset...');
    const startTime = Date.now();

    // Call the database function to reset counters
    const { data, error } = await supabase.rpc('reset_monthly_parts_counters');

    if (error) {
      console.error('Error resetting parts counters:', error);
      throw new Error(`Database error: ${error.message}`);
    }

    const resetResults = data || [];
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Calculate summary statistics
    const summary = {
      total_tenants_reset: resetResults.length,
      total_parts_reset: resetResults.reduce((sum: number, r: any) => sum + (r.previous_count || 0), 0),
      successful_resets: resetResults.filter((r: any) => r.reset_successful).length,
      failed_resets: resetResults.filter((r: any) => !r.reset_successful).length,
      duration_ms: duration,
      reset_timestamp: new Date().toISOString(),
    };

    console.log('Monthly reset completed:', summary);

    // Log the reset to a monitoring table (optional)
    // You could create a cron_job_logs table to track executions
    try {
      await supabase.from('monthly_reset_logs').insert({
        tenant_id: null, // System-level log
        reset_type: 'automatic',
        metadata: {
          summary,
          reset_details: resetResults,
        },
      });
    } catch (logError) {
      console.warn('Failed to log reset to monitoring table:', logError);
      // Don't fail the entire job if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          summary,
          reset_details: resetResults,
          message: `Successfully reset parts counters for ${summary.total_tenants_reset} tenant(s)`,
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in monthly-reset-cron:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message,
          timestamp: new Date().toISOString(),
        }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
