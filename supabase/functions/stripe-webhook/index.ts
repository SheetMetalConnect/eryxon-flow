import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN_MAP: Record<string, string> = {
  'price_pro_eur_monthly': 'pro',
  'price_premium_eur_monthly': 'premium',
  // Add your actual Stripe price IDs here
};

function getPlanFromPriceId(priceId: string | undefined): string {
  if (!priceId) return 'free';
  return PRICE_TO_PLAN_MAP[priceId] || 'free';
}

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify webhook signature
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log(`Processing Stripe event: ${event.type}`);

    // Process the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;

        if (!tenantId) {
          console.error('No tenant ID in session metadata');
          break;
        }

        // Get the subscription details
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const priceId = subscription.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);

        // Update tenant subscription
        const { error: updateError } = await supabase
          .from('tenants')
          .update({
            stripe_subscription_id: subscription.id,
            stripe_price_id: priceId,
            plan: plan,
            status: subscription.status === 'trialing' ? 'trial' : 'active',
            subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
            payment_failed_at: null,
            grace_period_ends_at: null,
          })
          .eq('id', tenantId);

        if (updateError) {
          console.error('Error updating tenant:', updateError);
          throw updateError;
        }

        // Log event
        await supabase.rpc('log_subscription_event', {
          p_tenant_id: tenantId,
          p_event_type: 'subscription_created',
          p_new_plan: plan,
          p_new_status: subscription.status === 'trialing' ? 'trial' : 'active',
          p_stripe_event_id: event.id,
          p_metadata: {
            subscription_id: subscription.id,
            price_id: priceId,
          },
        });

        console.log(`Subscription created for tenant ${tenantId}, plan: ${plan}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;

        // Find tenant by subscription ID
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, plan, status')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!tenant) {
          console.error('No tenant found for subscription:', subscription.id);
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        const newPlan = getPlanFromPriceId(priceId);
        const oldPlan = tenant.plan;
        const oldStatus = tenant.status;

        // Map Stripe status to our status
        let newStatus: string;
        switch (subscription.status) {
          case 'active':
            newStatus = 'active';
            break;
          case 'trialing':
            newStatus = 'trial';
            break;
          case 'past_due':
            newStatus = 'suspended';
            break;
          case 'canceled':
          case 'unpaid':
            newStatus = 'cancelled';
            break;
          default:
            newStatus = subscription.status;
        }

        // Update tenant
        await supabase
          .from('tenants')
          .update({
            stripe_price_id: priceId,
            plan: newPlan,
            status: newStatus,
            subscription_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            subscription_current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          })
          .eq('id', tenant.id);

        // Log event
        await supabase.rpc('log_subscription_event', {
          p_tenant_id: tenant.id,
          p_event_type: 'subscription_updated',
          p_old_plan: oldPlan,
          p_new_plan: newPlan,
          p_old_status: oldStatus,
          p_new_status: newStatus,
          p_stripe_event_id: event.id,
        });

        console.log(`Subscription updated for tenant ${tenant.id}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Find tenant
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, plan, status')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (!tenant) {
          console.error('No tenant found for subscription:', subscription.id);
          break;
        }

        // Downgrade to free tier
        await supabase
          .from('tenants')
          .update({
            plan: 'free',
            status: 'cancelled',
            stripe_subscription_id: null,
            stripe_price_id: null,
            subscription_current_period_end: new Date().toISOString(),
            trial_end: null,
            payment_failed_at: null,
            grace_period_ends_at: null,
          })
          .eq('id', tenant.id);

        // Log event
        await supabase.rpc('log_subscription_event', {
          p_tenant_id: tenant.id,
          p_event_type: 'subscription_cancelled',
          p_old_plan: tenant.plan,
          p_new_plan: 'free',
          p_old_status: tenant.status,
          p_new_status: 'cancelled',
          p_stripe_event_id: event.id,
        });

        console.log(`Subscription cancelled for tenant ${tenant.id}, downgraded to free`);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;

        // Find tenant by customer ID
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, plan, status')
          .eq('stripe_customer_id', invoice.customer)
          .single();

        if (!tenant) {
          console.error('No tenant found for customer:', invoice.customer);
          break;
        }

        // Set grace period (7 days from now)
        const gracePeriodEnd = new Date();
        gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 7);

        // Update tenant to suspended with grace period
        await supabase
          .from('tenants')
          .update({
            status: 'suspended',
            payment_failed_at: new Date().toISOString(),
            grace_period_ends_at: gracePeriodEnd.toISOString(),
          })
          .eq('id', tenant.id);

        // Log event
        await supabase.rpc('log_subscription_event', {
          p_tenant_id: tenant.id,
          p_event_type: 'payment_failed',
          p_old_status: tenant.status,
          p_new_status: 'suspended',
          p_stripe_event_id: event.id,
          p_metadata: {
            invoice_id: invoice.id,
            amount_due: invoice.amount_due,
          },
        });

        console.log(`Payment failed for tenant ${tenant.id}, grace period until ${gracePeriodEnd.toISOString()}`);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;

        // Find tenant by customer ID
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id, plan, status')
          .eq('stripe_customer_id', invoice.customer)
          .single();

        if (!tenant) {
          console.error('No tenant found for customer:', invoice.customer);
          break;
        }

        // Clear payment failure status
        await supabase
          .from('tenants')
          .update({
            status: 'active',
            payment_failed_at: null,
            grace_period_ends_at: null,
          })
          .eq('id', tenant.id);

        // Log event
        await supabase.rpc('log_subscription_event', {
          p_tenant_id: tenant.id,
          p_event_type: 'payment_succeeded',
          p_old_status: tenant.status,
          p_new_status: 'active',
          p_stripe_event_id: event.id,
          p_metadata: {
            invoice_id: invoice.id,
            amount_paid: invoice.amount_paid,
          },
        });

        console.log(`Payment succeeded for tenant ${tenant.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
