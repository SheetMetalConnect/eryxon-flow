import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Lock,
  ArrowUp,
  Settings,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { canSeeBillingFeatures } from '@/utils/subscriptionGuard';

// Stripe Price IDs (you'll need to create these in Stripe Dashboard)
const STRIPE_PRICE_IDS = {
  pro: 'price_pro_eur_monthly', // Replace with your actual Stripe price ID
  premium: 'price_premium_eur_monthly', // Replace with your actual Stripe price ID
};

interface StripeBillingSectionProps {
  currentPlan: 'free' | 'pro' | 'premium';
  tenantId: string;
  billingEnabled?: boolean;
}

export const StripeBillingSection: React.FC<StripeBillingSectionProps> = ({
  currentPlan,
  tenantId,
  billingEnabled = false,
}) => {
  const { profile } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const isAdmin = profile?.role === 'admin';
  const canSeeBilling = canSeeBillingFeatures({ billing_enabled: billingEnabled } as any, isAdmin);

  const handleUpgrade = async (targetPlan: 'pro' | 'premium') => {
    setLoading(`upgrade-${targetPlan}`);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-create-checkout', {
        body: {
          priceId: STRIPE_PRICE_IDS[targetPlan],
          // tenantId is no longer needed - server gets it from auth
        },
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (error) {
      console.error('Upgrade error:', error);
      toast.error('Failed to start upgrade process. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setLoading('portal');
    try {
      const { data, error } = await supabase.functions.invoke('stripe-portal', {
        body: {}, // tenantId no longer needed - server gets it from auth
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Redirect to Stripe Customer Portal
      window.location.href = data.url;
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Failed to open billing portal. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  // Coming Soon Mode for non-admins or when billing is not enabled
  if (!canSeeBilling) {
    return (
      <Card className="glass-card bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-blue-500/20">
        <CardContent className="p-6 text-center">
          <Lock className="h-16 w-16 mx-auto mb-4 text-blue-500" />
          <h3 className="text-xl font-semibold mb-3">Professional Billing Coming Soon</h3>
          <p className="text-sm text-muted-foreground mb-4">
            We're preparing a professional billing system with multiple payment options including
            Stripe with iDEAL, SEPA Direct Debit, and invoice-based billing.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Badge variant="outline">🇪🇺 EU Only</Badge>
            <Badge variant="outline">💶 Euro Currency</Badge>
            <Badge variant="outline">🏢 Business Accounts</Badge>
          </div>
          {isAdmin && (
            <Alert className="mt-4 bg-blue-500/10 border-blue-500/20">
              <AlertDescription className="text-sm">
                <strong>Admin Note:</strong> Billing features will be enabled by super admin for testing.
                Contact support to enable billing for your account.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full Billing Features (Admin with billing_enabled = true)
  return (
    <div className="space-y-4">
      <Alert className="bg-green-500/10 border-green-500/20">
        <AlertDescription>
          <div className="font-semibold text-sm">✅ Billing Enabled (Testing Mode)</div>
          <div className="text-xs text-muted-foreground mt-1">
            You have early access to the billing system. All features are functional.
          </div>
        </AlertDescription>
      </Alert>

      <Card className="glass-card">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">Subscription Management</h3>

          <div className="space-y-3">
            {currentPlan === 'free' && (
              <>
                <Button
                  size="lg"
                  onClick={() => handleUpgrade('pro')}
                  disabled={!!loading}
                  className="w-full"
                >
                  {loading === 'upgrade-pro' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Upgrade to Pro (€97/month)
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => handleUpgrade('premium')}
                  disabled={!!loading}
                  className="w-full"
                >
                  {loading === 'upgrade-premium' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Upgrade to Premium (€497/month)
                    </>
                  )}
                </Button>
              </>
            )}

            {currentPlan === 'pro' && (
              <>
                <Button
                  size="lg"
                  onClick={() => handleUpgrade('premium')}
                  disabled={!!loading}
                  className="w-full"
                >
                  {loading === 'upgrade-premium' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Redirecting to Stripe...
                    </>
                  ) : (
                    <>
                      <ArrowUp className="h-4 w-4 mr-2" />
                      Upgrade to Premium (€497/month)
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleManageBilling}
                  disabled={!!loading}
                  className="w-full"
                >
                  {loading === 'portal' ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Opening Portal...
                    </>
                  ) : (
                    <>
                      <Settings className="h-4 w-4 mr-2" />
                      Manage Billing
                    </>
                  )}
                </Button>
              </>
            )}

            {currentPlan === 'premium' && (
              <Button
                variant="outline"
                size="lg"
                onClick={handleManageBilling}
                disabled={!!loading}
                className="w-full"
              >
                {loading === 'portal' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Opening Portal...
                  </>
                ) : (
                  <>
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Billing
                  </>
                )}
              </Button>
            )}
          </div>

          <Alert className="mt-4 bg-blue-500/10 border-blue-500/20">
            <AlertDescription>
              <div className="font-semibold text-sm mb-1">Payment Methods:</div>
              <div className="text-xs text-muted-foreground">
                • iDEAL (Netherlands)<br />
                • SEPA Direct Debit (EU-wide)<br />
                • Credit/Debit Cards
              </div>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};
