import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Mail, Loader2, Trash2 } from 'lucide-react';
import { useInvitations } from '@/hooks/useInvitations';
import { toast } from 'sonner';

interface InviteEntry {
  id: string;
  email: string;
  role: 'operator' | 'admin';
}

export function InvitationManager() {
  const { invitations, createInvitation, cancelInvitation, loading } = useInvitations();
  const [inviteEntries, setInviteEntries] = useState<InviteEntry[]>([
    { id: '1', email: '', role: 'operator' }
  ]);
  const [sending, setSending] = useState(false);

  const addInviteEntry = () => {
    setInviteEntries([
      ...inviteEntries,
      { id: Date.now().toString(), email: '', role: 'operator' }
    ]);
  };

  const removeInviteEntry = (id: string) => {
    setInviteEntries(inviteEntries.filter(entry => entry.id !== id));
  };

  const updateInviteEntry = (id: string, field: 'email' | 'role', value: string) => {
    setInviteEntries(inviteEntries.map(entry =>
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handleSendInvitations = async () => {
    // Filter out empty emails
    const validEntries = inviteEntries.filter(entry => entry.email.trim() !== '');

    if (validEntries.length === 0) {
      toast.error('Please enter at least one email address');
      return;
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = validEntries.filter(entry => !emailRegex.test(entry.email));

    if (invalidEmails.length > 0) {
      toast.error('Please check email formats');
      return;
    }

    setSending(true);

    try {
      // Send invitations
      const promises = validEntries.map(entry =>
        createInvitation(entry.email, entry.role)
      );

      await Promise.all(promises);

      // Clear form
      setInviteEntries([{ id: Date.now().toString(), email: '', role: 'operator' }]);

      toast.success(`Sent ${validEntries.length} invitation${validEntries.length > 1 ? 's' : ''}`);
    } catch (error) {
      console.error('Error sending invitations:', error);
    } finally {
      setSending(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    await cancelInvitation(invitationId);
  };

  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');

  return (
    <div className="space-y-6">
      {/* New Invitations Form */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Invite Team Members</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={addInviteEntry}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another
          </Button>
        </div>

        <div className="space-y-3">
          {inviteEntries.map((entry, index) => (
            <div key={entry.id} className="flex gap-3 items-end">
              <div className="flex-1">
                <Label htmlFor={`email-${entry.id}`}>
                  Email {index === 0 && <span className="text-muted-foreground text-xs">(optional)</span>}
                </Label>
                <Input
                  id={`email-${entry.id}`}
                  type="email"
                  placeholder="colleague@example.com"
                  value={entry.email}
                  onChange={(e) => updateInviteEntry(entry.id, 'email', e.target.value)}
                />
              </div>

              <div className="w-40">
                <Label htmlFor={`role-${entry.id}`}>Role</Label>
                <Select
                  value={entry.role}
                  onValueChange={(value: 'operator' | 'admin') =>
                    updateInviteEntry(entry.id, 'role', value)
                  }
                >
                  <SelectTrigger id={`role-${entry.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="operator">Operator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {inviteEntries.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeInviteEntry(entry.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        <Button
          onClick={handleSendInvitations}
          disabled={sending}
          className="gap-2"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          <Mail className="h-4 w-4" />
          Send Invitations
        </Button>
      </div>

      {/* Pending Invitations List */}
      {pendingInvitations.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-lg font-semibold">Pending Invitations</h3>

          <div className="space-y-2">
            {pendingInvitations.map((invitation) => (
              <Card key={invitation.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{invitation.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={invitation.role === 'admin' ? 'default' : 'secondary'}>
                      {invitation.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
