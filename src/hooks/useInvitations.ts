import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Invitation {
  id: string;
  tenant_id: string;
  email: string;
  role: 'operator' | 'admin';
  token: string;
  invited_by: string;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export function useInvitations() {
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load invitations for current tenant
  const loadInvitations = async () => {
    if (!profile?.tenant_id) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setInvitations((data || []) as any);
    } catch (err: any) {
      setError(err.message);
      console.error('Error loading invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  // Create new invitation and send email via Edge Function
  const createInvitation = async (email: string, role: 'operator' | 'admin' = 'operator') => {
    if (!profile?.tenant_id) {
      toast.error('No tenant found');
      return null;
    }

    try {
      // Get the current session for auth - refresh if needed
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          toast.error('Session expired. Please log in again.');
          throw new Error('Session expired');
        }
      }

      // Call the Edge Function to create invitation and send email
      const { data: funcData, error: funcError } = await supabase.functions.invoke('send-invitation', {
        body: {
          email,
          role,
          tenant_id: profile.tenant_id,
        },
      });

      if (funcError) {
        // Parse the error message if it's JSON
        let errorMessage = funcError.message || 'Failed to create invitation';
        try {
          const parsed = JSON.parse(errorMessage);
          errorMessage = parsed.error || errorMessage;
        } catch { /* ignore parsing errors */ }
        throw new Error(errorMessage);
      }

      const result = funcData;

      if (result.email_sent) {
        toast.success(`Invitation sent to ${email}`);
      } else if (result.invitation_url) {
        // Email not configured - show the URL for manual sharing
        toast.success(
          `Invitation created! Share this link with ${email}`,
          {
            duration: 10000,
            description: result.invitation_url,
          }
        );
      } else {
        toast.success(`Invitation created for ${email}`);
      }

      // Reload invitations
      await loadInvitations();

      return result.invitation_id;
    } catch (err: any) {
      toast.error(err.message || 'Failed to create invitation');
      console.error('Error creating invitation:', err);
      return null;
    }
  };

  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('cancel_invitation' as any, {
        p_invitation_id: invitationId,
      });

      if (rpcError) throw rpcError;

      toast.success('Invitation cancelled');

      // Reload invitations
      await loadInvitations();

      return data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to cancel invitation');
      console.error('Error cancelling invitation:', err);
      return null;
    }
  };

  // Get invitation by token (public - no auth required)
  const getInvitationByToken = async (token: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_invitation_by_token', {
        p_token: token,
      });

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        throw new Error('Invalid or expired invitation');
      }

      return data[0];
    } catch (err: any) {
      toast.error(err.message || 'Failed to load invitation');
      console.error('Error getting invitation:', err);
      return null;
    }
  };

  // Accept invitation (called during signup)
  const acceptInvitation = async (token: string, userId: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('accept_invitation' as any, {
        p_token: token,
        p_user_id: userId,
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept invitation');
      console.error('Error accepting invitation:', err);
      return null;
    }
  };

  // Load invitations on mount
  useEffect(() => {
    if (profile?.tenant_id) {
      loadInvitations();
    }
  }, [profile?.tenant_id]);

  return {
    invitations,
    loading,
    error,
    createInvitation,
    cancelInvitation,
    getInvitationByToken,
    acceptInvitation,
    reload: loadInvitations,
  };
}
