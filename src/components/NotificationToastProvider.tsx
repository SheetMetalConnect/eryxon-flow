import React, { useEffect, useRef } from 'react';
import { useToast } from '@/components/mui/ToastNotification';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { useNotifications } from '@/hooks/useNotifications';

type Notification = Database['public']['Tables']['notifications']['Row'];

/**
 * This component subscribes to real-time notification changes and shows toast notifications
 * for new notifications that arrive while the user is active in the app.
 */
export const NotificationToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showNotificationToast } = useToast();
  const { profile } = useAuth();
  const { togglePin } = useNotifications();
  const lastNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile) return;

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notification_toasts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `tenant_id=eq.${profile.tenant_id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;

          // Only show toast if:
          // 1. Notification is for this user (or is global)
          // 2. It's not the same notification we just processed (debounce)
          if (
            (notification.user_id === null || notification.user_id === profile.id) &&
            notification.id !== lastNotificationIdRef.current
          ) {
            lastNotificationIdRef.current = notification.id;

            // Show toast with pin action
            const severity = notification.severity === 'high'
              ? 'error'
              : notification.severity === 'medium'
              ? 'warning'
              : 'info';

            showNotificationToast(
              `${notification.title}: ${notification.message}`,
              severity as any,
              () => togglePin(notification.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, showNotificationToast, togglePin]);

  return <>{children}</>;
};
