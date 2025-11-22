import React, { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Pin } from 'lucide-react';

type Notification = Database['public']['Tables']['notifications']['Row'];

/**
 * This component subscribes to real-time notification changes and shows toast notifications
 * for new notifications that arrive while the user is active in the app.
 */
export const NotificationToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toast } = useToast();
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
            const variant = notification.severity === 'high'
              ? 'destructive'
              : notification.severity === 'medium'
              ? 'default'
              : 'default';

            toast({
              title: notification.title,
              description: notification.message,
              variant,
              duration: 6000,
              action: (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePin(notification.id)}
                  className="gap-2"
                >
                  <Pin className="h-4 w-4" />
                  Pin
                </Button>
              ),
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, toast, togglePin]);

  return <>{children}</>;
};
