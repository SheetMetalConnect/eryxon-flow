import React from 'react';
import { Ban, CreditCard, ArrowUpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  const getAlertVariant = (): 'default' | 'destructive' => {
    switch (result.reason) {
      case 'payment_overdue':
        return 'default';
      case 'payment_failed':
      case 'subscription_cancelled':
        return 'destructive';
      default:
        return 'default';
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
    <div className="flex items-center justify-center min-h-screen p-6 bg-gradient-to-br from-background to-muted/30">
      <Card className="glass-card max-w-xl w-full">
        <CardContent className="p-8 text-center">
          <Ban className="h-20 w-20 text-destructive mx-auto mb-4" />

          <h1 className="text-3xl font-bold mb-4">{getTitle()}</h1>

          <Alert variant={getAlertVariant()} className="mb-6 text-left">
            <AlertDescription>
              {getSubscriptionMessage(result)}
            </AlertDescription>
          </Alert>

          {result.gracePeriodEnds && (
            <Alert className="mb-6 text-left border-yellow-500/50 bg-yellow-500/10">
              <AlertTitle className="font-semibold">
                Grace Period Ends: {result.gracePeriodEnds.toLocaleString()}
              </AlertTitle>
              <AlertDescription className="text-sm">
                Update your payment method before this date to avoid service interruption.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            {(result.reason === 'payment_overdue' || result.reason === 'payment_failed') && onManageBilling && (
              <Button
                size="lg"
                onClick={onManageBilling}
                className="w-full cta-button"
              >
                <CreditCard className="h-5 w-5 mr-2" />
                Update Payment Method
              </Button>
            )}

            {(result.reason === 'subscription_cancelled' || result.reason === 'no_subscription') && onUpgrade && (
              <Button
                size="lg"
                onClick={onUpgrade}
                className="w-full cta-button"
              >
                <ArrowUpCircle className="h-5 w-5 mr-2" />
                Upgrade Now
              </Button>
            )}

            <Button
              variant="outline"
              size="lg"
              asChild
              className="w-full"
            >
              <a href="mailto:support@eryxonflow.com">
                Contact Support
              </a>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            Need help? Our support team is here to assist you.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionBlocked;
