import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvitationManager } from './InvitationManager';
import { OperatorCreationForm } from './OperatorCreationForm';
import { Users, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface TeamSetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function TeamSetup({ onComplete, onSkip }: TeamSetupProps) {
  const [activeTab, setActiveTab] = useState('invitations');
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Users className="h-12 w-12 mx-auto text-primary" />
        <h2 className="text-3xl font-bold tracking-tight">{t('onboarding.teamSetup.title')}</h2>
        <p className="text-muted-foreground text-lg">
          {t('onboarding.teamSetup.description')}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invitations">{t('onboarding.teamSetup.inviteTab')}</TabsTrigger>
          <TabsTrigger value="operators">{t('onboarding.teamSetup.operatorsTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="invitations" className="mt-6">
          <InvitationManager />
        </TabsContent>

        <TabsContent value="operators" className="mt-6">
          <OperatorCreationForm />
        </TabsContent>
      </Tabs>

      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="ghost" onClick={onSkip}>
          {t('onboarding.skipForNow')}
        </Button>
        <Button onClick={onComplete} className="cta-button">
          {t('onboarding.continue')}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
