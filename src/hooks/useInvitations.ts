import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

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
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvitations = useCallback(async () => {
    if (!profile?.tenant_id) {
      setInvitations([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setInvitations((data || []) as Invitation[]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      logger.error('useInvitations', 'Error loading invitations', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  const createInvitation = useCallback(async (email: string, role: 'operator' | 'admin' = 'operator') => {
    if (!profile?.tenant_id) {
      toast.error(t('notifications.noTenantFound'));
      return null;
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        // Try to refresh the session
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshData.session) {
          toast.error(t('notifications.sessionExpired'));
          throw new Error('Session expired');
        }
      }

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

      toast.success(t('notifications.success'), {
        duration: result.invitation_url ? 10000 : undefined,
        description: result.invitation_url || undefined,
      });

      await loadInvitations();

      return result.invitation_id;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('notifications.failed');
      toast.error(message);
      logger.error('useInvitations', 'Error creating invitation', err);
      return null;
    }
  }, [loadInvitations, profile?.tenant_id, t]);

  const cancelInvitation = useCallback(async (invitationId: string): Promise<void> => {
    try {
      const { data, error: rpcError } = await supabase.rpc('cancel_invitation', {
        p_invitation_id: invitationId,
      });

      if (rpcError) throw rpcError;

      toast.success(t('invitation.cancelled'));

      await loadInvitations();

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('notifications.failed');
      toast.error(message);
      logger.error('useInvitations', 'Error cancelling invitation', err);
    }
  }, [loadInvitations, t]);

  const getInvitationByToken = useCallback(async (token: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_invitation_by_token', {
        p_token: token,
      });

      if (rpcError) throw rpcError;

      if (!data || data.length === 0) {
        throw new Error('Invalid or expired invitation');
      }

      return data[0];
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('notifications.failed');
      toast.error(message);
      logger.error('useInvitations', 'Error getting invitation', err);
      return null;
    }
  }, [t]);

  const acceptInvitation = useCallback(async (token: string, userId: string) => {
    try {
      const { data, error: rpcError } = await supabase.rpc('accept_invitation', {
        p_token: token,
        p_user_id: userId,
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('notifications.failed');
      toast.error(message);
      logger.error('useInvitations', 'Error accepting invitation', err);
      return null;
    }
  }, [t]);

  useEffect(() => {
    void loadInvitations();
  }, [loadInvitations]);

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
