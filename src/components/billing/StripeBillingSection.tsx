import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import {
  CreditCard as CreditCardIcon,
  Upgrade as UpgradeIcon,
  Settings as SettingsIcon,
  Lock as LockIcon,
} from '@mui/icons-material';
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
      <Card
        sx={{
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)',
          border: '1px solid',
          borderColor: 'primary.main',
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <LockIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={600} gutterBottom>
            Professional Billing Coming Soon
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            We're preparing a professional billing system with multiple payment options including
            Stripe with iDEAL, SEPA Direct Debit, and invoice-based billing.
          </Typography>
          <Stack spacing={1} alignItems="center">
            <Chip label="🇪🇺 EU Only" variant="outlined" />
            <Chip label="💶 Euro Currency" variant="outlined" />
            <Chip label="🏢 Business Accounts" variant="outlined" />
          </Stack>
          {isAdmin && (
            <Alert severity="info" sx={{ mt: 3 }}>
              <Typography variant="body2">
                <strong>Admin Note:</strong> Billing features will be enabled by super admin for testing.
                Contact support to enable billing for your account.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  // Full Billing Features (Admin with billing_enabled = true)
  return (
    <Box>
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600}>
          ✅ Billing Enabled (Testing Mode)
        </Typography>
        <Typography variant="caption">
          You have early access to the billing system. All features are functional.
        </Typography>
      </Alert>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            Subscription Management
          </Typography>

          <Stack spacing={2}>
            {currentPlan === 'free' && (
              <>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={loading === 'upgrade-pro' ? <CircularProgress size={20} /> : <UpgradeIcon />}
                  onClick={() => handleUpgrade('pro')}
                  disabled={!!loading}
                  fullWidth
                >
                  {loading === 'upgrade-pro' ? 'Redirecting to Stripe...' : 'Upgrade to Pro (€97/month)'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={loading === 'upgrade-premium' ? <CircularProgress size={20} /> : <UpgradeIcon />}
                  onClick={() => handleUpgrade('premium')}
                  disabled={!!loading}
                  fullWidth
                >
                  {loading === 'upgrade-premium' ? 'Redirecting to Stripe...' : 'Upgrade to Premium (€497/month)'}
                </Button>
              </>
            )}

            {currentPlan === 'pro' && (
              <>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={loading === 'upgrade-premium' ? <CircularProgress size={20} /> : <UpgradeIcon />}
                  onClick={() => handleUpgrade('premium')}
                  disabled={!!loading}
                  fullWidth
                >
                  {loading === 'upgrade-premium' ? 'Redirecting to Stripe...' : 'Upgrade to Premium (€497/month)'}
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={loading === 'portal' ? <CircularProgress size={20} /> : <SettingsIcon />}
                  onClick={handleManageBilling}
                  disabled={!!loading}
                  fullWidth
                >
                  {loading === 'portal' ? 'Opening Portal...' : 'Manage Billing'}
                </Button>
              </>
            )}

            {currentPlan === 'premium' && (
              <Button
                variant="outlined"
                size="large"
                startIcon={loading === 'portal' ? <CircularProgress size={20} /> : <SettingsIcon />}
                onClick={handleManageBilling}
                disabled={!!loading}
                fullWidth
              >
                {loading === 'portal' ? 'Opening Portal...' : 'Manage Billing'}
              </Button>
            )}
          </Stack>

          <Alert severity="info" sx={{ mt: 3 }}>
            <Typography variant="body2">
              <strong>Payment Methods:</strong>
            </Typography>
            <Typography variant="caption" component="div">
              • iDEAL (Netherlands)<br />
              • SEPA Direct Debit (EU-wide)<br />
              • Credit/Debit Cards<br />
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    </Box>
  );
};
