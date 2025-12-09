import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { useToast } from '@/components/ui/use-toast';

type Notification = Database['public']['Tables']['notifications']['Row'];
type NotificationType = Notification['type'];
type NotificationSeverity = Notification['severity'];

export interface NotificationFilters {
  type?: NotificationType;
  read?: boolean;
  pinned?: boolean;
  dismissed?: boolean;
}

export const useNotifications = (filters?: NotificationFilters) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  // Fetch notifications
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

      // Apply filters
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
      console.error('Error fetching notifications:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [profile, filters]);

  // Mark notification as read
  const markAsRead = useCallback(
    async (notificationId: string) => {
      try {
        const { error: rpcError } = await supabase.rpc('mark_notification_read', {
          p_notification_id: notificationId,
        });

        if (rpcError) throw rpcError;

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true, read_at: new Date().toISOString() } : n
          )
        );
      } catch (err) {
        console.error('Error marking notification as read:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to mark notification as read',
        });
      }
    },
    [toast]
  );

  // Toggle pin
  const togglePin = useCallback(
    async (notificationId: string) => {
      try {
        const { data: pinned, error: rpcError } = await supabase.rpc('toggle_notification_pin', {
          p_notification_id: notificationId,
        });

        if (rpcError) throw rpcError;

        // Update local state
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, pinned: pinned || false, pinned_at: pinned ? new Date().toISOString() : null }
              : n
          )
        );

        toast({
          title: 'Success',
          description: pinned ? 'Notification pinned' : 'Notification unpinned',
        });
      } catch (err) {
        console.error('Error toggling notification pin:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to pin/unpin notification',
        });
      }
    },
    [toast]
  );

  // Dismiss notification
  const dismiss = useCallback(
    async (notificationId: string) => {
      try {
        const { error: rpcError } = await supabase.rpc('dismiss_notification', {
          p_notification_id: notificationId,
        });

        if (rpcError) throw rpcError;

        // Update local state - remove from list
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));

        toast({
          title: 'Success',
          description: 'Notification dismissed',
        });
      } catch (err) {
        console.error('Error dismissing notification:', err);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to dismiss notification',
        });
      }
    },
    [toast]
  );

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      const { data: count, error: rpcError } = await supabase.rpc('mark_all_notifications_read');

      if (rpcError) throw rpcError;

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, read_at: new Date().toISOString() }))
      );

      if (count && count > 0) {
        toast({
          title: 'Success',
          description: `Marked ${count} notification(s) as read`,
        });
      }
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark all notifications as read',
      });
    }
  }, [toast]);

  // Get unread count
  const unreadCount = notifications.filter((n) => !n.read && !n.dismissed).length;

  // Get pinned notifications
  const pinnedNotifications = notifications.filter((n) => n.pinned && !n.dismissed);

  // Get unpinned notifications
  const unpinnedNotifications = notifications.filter((n) => !n.pinned && !n.dismissed);

  // Set up real-time subscription
  useEffect(() => {
    if (!profile) return;

    // Initial fetch
    fetchNotifications();

    // Set up real-time subscription for new notifications
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
          // Refetch notifications when changes occur
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
