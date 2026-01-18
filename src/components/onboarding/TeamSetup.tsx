import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InvitationManager } from './InvitationManager';
import { OperatorCreationForm } from './OperatorCreationForm';

interface TeamSetupProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function TeamSetup({ onComplete, onSkip }: TeamSetupProps) {
  const [activeTab, setActiveTab] = useState('invitations');

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Build Your Team</h2>
        <p className="text-muted-foreground">
          Invite colleagues or create operators for your shop floor
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="invitations">Invite via Email</TabsTrigger>
          <TabsTrigger value="operators">Create Operators</TabsTrigger>
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
          Skip for Now
        </Button>
        <Button onClick={onComplete}>
          Continue
        </Button>
      </div>
    </div>
  );
}
