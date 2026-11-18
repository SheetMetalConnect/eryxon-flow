import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Mail, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import type { Invitation } from "@/hooks/useInvitations";

interface PendingInvitationsProps {
  invitations: Invitation[];
  onCancel: (id: string) => Promise<void>;
}

export function PendingInvitations({ invitations, onCancel }: PendingInvitationsProps) {
  const { t } = useTranslation();
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  if (pendingInvitations.length === 0) return null;

  return (
    <Card className="glass-card border-yellow-500/20">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          Pending Invitations ({pendingInvitations.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingInvitations.map((invitation) => (
            <div key={invitation.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border-subtle">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Mail className="h-4 w-4 text-yellow-500" />
                </div>
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Expires {new Date(invitation.expires_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'}>
                  {invitation.role === 'admin' ? 'Admin' : 'Operator'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const url = `${window.location.origin}/accept-invitation/${invitation.token}`;
                    navigator.clipboard.writeText(url);
                    toast.success(t("users.invitationLinkCopied"));
                  }}
                  className="gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onCancel(invitation.id)}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                  Cancel
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
