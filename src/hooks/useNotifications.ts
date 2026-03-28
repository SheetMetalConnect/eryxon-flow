import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';
import { Database } from '@/integrations/supabase/types';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/logger';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationType = Notification['type'];

export interface NotificationFilters {
  type?: NotificationType;
  read?: boolean;
  pinned?: boolean;
  dismissed?: boolean;
}

export const useNotifications = (filters?: NotificationFilters) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const profile = useProfile();

  const fetchNotifications = useCallback(async () => {
    if (!profile) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });

      // Apply user filter - only get notifications for the current user or global notifications
      query = query.or(`user_id.is.null,user_id.eq.${profile.id}`);

      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.read !== undefined) {
        query = query.eq('read', filters.read);
      }
      if (filters?.pinned !== undefined) {
        query = query.eq('pinned', filters.pinned);
      }
      if (filters?.dismissed !== undefined) {
        query = query.eq('dismissed', filters.dismissed);
      } else {
        // By default, don't show dismissed notifications
        query = query.eq('dismissed', false);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setNotifications(data || []);
    } catch (err) {
      logger.error('useNotifications', 'Error fetching notifications', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [profile, filters]);

  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error: rpcError } = await supabase.rpc('mark_notification_read', {
          p_notification_id: notificationId,
        });

        if (rpcError) throw rpcError;

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
          )
        );
      } catch (err) {
        logger.error('useNotifications', 'Error marking notification as read', err);
        toast.error(t('notifications.error'), { description: t('notifications.failed') });
      }
    },
    [t]
  );

  const togglePin = useCallback(
    async (notificationId: string) => {
      try {
        const { data: pinned, error: rpcError } = await supabase.rpc('toggle_notification_pin', {
          p_notification_id: notificationId,
        });

        if (rpcError) throw rpcError;

        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, pinned: pinned || false, pinned_at: pinned ? new Date().toISOString() : null }
              : n
          )
        );

        toast.success(t('notifications.success'), { description: pinned ? t('notifications.pinned') : t('notifications.unpinned') });
      } catch (err) {
        logger.error('useNotifications', 'Error toggling notification pin', err);
        toast.error(t('notifications.error'), { description: t('notifications.failed') });
      }
    },
    [t]
  );

  const dismiss = useCallback(
    async (notificationId: string) => {
      try {
        const { error: rpcError } = await supabase.rpc('dismiss_notification', {
          p_notification_id: notificationId,
        });

        if (rpcError) throw rpcError;

        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        toast.success(t('notifications.success'), { description: t('notifications.deleted') });
      } catch (err) {
        logger.error('useNotifications', 'Error dismissing notification', err);
        toast.error(t('notifications.error'), { description: t('notifications.failed') });
      }
    },
    [t]
  );

  const markAllAsRead = useCallback(async () => {
    try {
      const { data: count, error: rpcError } = await supabase.rpc('mark_all_notifications_read');

      if (rpcError) throw rpcError;

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );

      if (count && count > 0) {
        toast.success(t('notifications.success'), { description: t('notifications.updated') });
      }
    } catch (err) {
      logger.error('useNotifications', 'Error marking all notifications as read', err);
      toast.error(t('notifications.error'), { description: t('notifications.failed') });
    }
  }, [t]);

  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length;
  const pinnedNotifications = notifications.filter((n) => n.pinned && !n.dismissed);
  const unpinnedNotifications = notifications.filter((n) => !n.pinned && !n.dismissed);

  useEffect(() => {
    if (!profile) return;

    fetchNotifications();

    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          logger.debug('useNotifications', 'Notification change', payload);
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, fetchNotifications]);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    pinnedNotifications,
    unpinnedNotifications,
    markAsRead,
    togglePin,
    dismiss,
    markAllAsRead,
    refetch: fetchNotifications,
  };
};
