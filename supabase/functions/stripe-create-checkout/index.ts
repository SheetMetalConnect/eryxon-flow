import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { priceId, tenantId } = await req.json();

    if (!priceId || !tenantId) {
      throw new Error('Missing required fields: priceId, tenantId');
    }

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, company_name, billing_email, stripe_customer_id, billing_enabled, vat_number, billing_country_code')
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      throw new Error('Tenant not found');
    }

    // COMING SOON MODE: Check if billing is enabled for this tenant
    if (!tenant.billing_enabled) {
      return new Response(
        JSON.stringify({
          error: 'Billing is not yet enabled for your account. Contact support for early access.',
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create or get Stripe customer
    let customerId = tenant.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: tenant.billing_email || '',
        name: tenant.company_name || tenant.name,
        metadata: {
          tenantId: tenant.id,
        },
        // Add VAT number if provided
        ...(tenant.vat_number && {
          tax_id_data: [{
            type: 'eu_vat',
            value: tenant.vat_number,
          }],
        }),
      });

      customerId = customer.id;

      // Save customer ID to database
      await supabase
        .from('tenants')
        .update({ stripe_customer_id: customerId })
        .eq('id', tenantId);
    }

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['ideal', 'sepa_debit', 'card'],
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('APP_URL') || 'http://localhost:5173'}/my-plan`,
      metadata: {
        tenantId: tenant.id,
      },
      // iDEAL and EU settings
      locale: 'auto',
      automatic_tax: {
        enabled: true,
      },
      customer_update: {
        address: 'auto',
      },
      // Allow promotion codes
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
