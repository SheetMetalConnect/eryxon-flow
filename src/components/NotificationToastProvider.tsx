import React, { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { useNotifications } from '@/hooks/useNotifications';
import { Pin } from 'lucide-react';

type Notification = Database['public']['Tables']['notifications']['Row'];

/**
 * This component subscribes to real-time notification changes and shows toast notifications
 * for new notifications that arrive while the user is active in the app.
 */
export const NotificationToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

            // Choose toast type based on severity
            const toastFn = notification.severity === 'high'
              ? toast.error
              : notification.severity === 'medium'
              ? toast.warning
              : toast.info;

            toastFn(notification.title, {
              description: notification.message,
              duration: 6000,
              action: {
                label: 'Pin',
                onClick: () => togglePin(notification.id),
              },
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, togglePin]);

  return <>{children}</>;
};
