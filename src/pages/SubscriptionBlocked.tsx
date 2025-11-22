import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Stack,
  useTheme,
} from '@mui/material';
import {
  BlockOutlined as BlockIcon,
  CreditCard as CreditCardIcon,
  Upgrade as UpgradeIcon,
} from '@mui/icons-material';
import type { SubscriptionAccessResult } from '@/utils/subscriptionGuard';
import { getSubscriptionMessage } from '@/utils/subscriptionGuard';

interface SubscriptionBlockedProps {
  result: SubscriptionAccessResult;
  onManageBilling?: () => void;
  onUpgrade?: () => void;
}

export const SubscriptionBlocked: React.FC<SubscriptionBlockedProps> = ({
  result,
  onManageBilling,
  onUpgrade,
}) => {
  const theme = useTheme();

  const getAlertSeverity = () => {
    switch (result.reason) {
      case 'payment_overdue':
        return 'warning';
      case 'payment_failed':
      case 'subscription_cancelled':
        return 'error';
      default:
        return 'info';
    }
  };

  const getTitle = () => {
    switch (result.reason) {
      case 'payment_overdue':
        return 'Payment Overdue';
      case 'payment_failed':
        return 'Payment Failed';
      case 'subscription_cancelled':
        return 'Subscription Cancelled';
      default:
        return 'Access Restricted';
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        p: 3,
        background: `linear-gradient(135deg, ${theme.palette.background.default} 0%, ${theme.palette.background.paper} 100%)`,
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <BlockIcon sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />

          <Typography variant="h4" fontWeight={700} gutterBottom>
            {getTitle()}
          </Typography>

          <Alert severity={getAlertSeverity()} sx={{ mb: 3, textAlign: 'left' }}>
            {getSubscriptionMessage(result)}
          </Alert>

          {result.gracePeriodEnds && (
            <Alert severity="warning" sx={{ mb: 3, textAlign: 'left' }}>
              <Typography variant="body2" fontWeight={600}>
                Grace Period Ends: {result.gracePeriodEnds.toLocaleString()}
              </Typography>
              <Typography variant="caption">
                Update your payment method before this date to avoid service interruption.
              </Typography>
            </Alert>
          )}

          <Stack spacing={2}>
            {(result.reason === 'payment_overdue' || result.reason === 'payment_failed') && onManageBilling && (
              <Button
                variant="contained"
                size="large"
                startIcon={<CreditCardIcon />}
                onClick={onManageBilling}
                fullWidth
              >
                Update Payment Method
              </Button>
            )}

            {(result.reason === 'subscription_cancelled' || result.reason === 'no_subscription') && onUpgrade && (
              <Button
                variant="contained"
                size="large"
                startIcon={<UpgradeIcon />}
                onClick={onUpgrade}
                fullWidth
              >
                Upgrade Now
              </Button>
            )}

            <Button
              variant="outlined"
              size="large"
              href="mailto:support@eryxonflow.com"
              fullWidth
            >
              Contact Support
            </Button>
          </Stack>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, display: 'block' }}>
            Need help? Our support team is here to assist you.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SubscriptionBlocked;
