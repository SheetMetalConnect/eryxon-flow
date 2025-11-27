import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Info,
  Mail,
  Clock,
  Loader2,
} from 'lucide-react';
import { useSubscription } from '../hooks/useSubscription';
import { useTranslation } from 'react-i18next';

export const MyPlan: React.FC = () => {
  const { t } = useTranslation();
  const { loading, error } = useSubscription();

  const handleContactUs = () => {
    window.location.href = `mailto:office@sheetmetalconnect.com?subject=${encodeURIComponent('Subscription Inquiry')}`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('myPlan.title')}</h1>
        <p className="text-muted-foreground">{t('myPlan.comingSoonSubtitle')}</p>
      </div>

      {/* Coming Soon */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border-primary/20">
        <CardContent className="p-8 text-center">
          <Clock className="h-16 w-16 mx-auto mb-4 text-primary" />
          <h2 className="text-2xl font-bold mb-3">{t('myPlan.comingSoonTitle')}</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            {t('myPlan.comingSoonDescription')}
          </p>
          <Button size="lg" onClick={handleContactUs}>
            <Mail className="h-4 w-4 mr-2" />
            {t('myPlan.contactUs')}
          </Button>
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert className="bg-cyan-500/10 border-cyan-500/20">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <div className="font-semibold mb-1">{t('myPlan.currentlyFree')}</div>
          <div className="text-xs text-muted-foreground">
            {t('myPlan.currentlyFreeDescription')}
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};
