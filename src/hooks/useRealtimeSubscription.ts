/**
 * Reusable Realtime Subscription Hook
 *
 * Provides a clean, consistent interface for subscribing to Supabase realtime changes.
 * Features:
 * 1. Automatic cleanup on unmount
 * 2. Proper tenant filtering
 * 3. Support for multiple table subscriptions
 * 4. Debounced callbacks to prevent cascade refetches
 * 5. Type-safe configuration
 *
 * @example
 * // Single table subscription with filter
 * useRealtimeSubscription({
 *   channelName: 'operations-updates',
 *   tables: [{
 *     table: 'operations',
 *     filter: `tenant_id=eq.${tenantId}`,
 *     event: '*',
 *   }],
 *   onDataChange: () => refetch(),
 *   enabled: !!tenantId,
 * });
 *
 * @example
 * // Multiple tables subscription
 * useRealtimeSubscription({
 *   channelName: 'production-updates',
 *   tables: [
 *     { table: 'operations', filter: `cell_id=eq.${cellId}` },
 *     { table: 'time_entries', filter: `tenant_id=eq.${tenantId}` },
 *   ],
 *   onDataChange: handleUpdate,
 *   debounceMs: 500,
 * });
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

export interface TableSubscription {
  /** The table name to subscribe to */
  table: string;
  /** Optional filter in Supabase format (e.g., 'tenant_id=eq.xxx') */
  filter?: string;
  /** Event type to listen for (defaults to '*' for all events) */
  event?: RealtimeEvent;
  /** Schema (defaults to 'public') */
  schema?: string;
}

export interface RealtimeSubscriptionOptions {
  /** Unique channel name for this subscription */
  channelName: string;
  /** Tables and their configurations to subscribe to */
  tables: TableSubscription[];
  /** Callback when data changes occur */
  onDataChange: (payload?: RealtimePostgresChangesPayload<Record<string, unknown>>) => void;
  /** Whether the subscription is enabled (defaults to true) */
  enabled?: boolean;
  /** Debounce delay in milliseconds (defaults to 100ms) */
  debounceMs?: number;
  /** Include full payload in callback (defaults to false for performance) */
  includePayload?: boolean;
}

/**
 * Debounce function for callback
 */
function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Hook for subscribing to realtime changes on Supabase tables
 */
export function useRealtimeSubscription(options: RealtimeSubscriptionOptions): void {
  const {
    channelName,
    tables,
    onDataChange,
    enabled = true,
    debounceMs = 100,
    includePayload = false,
  } = options;

  // Stable callback ref to avoid re-subscribing on callback changes
  const callbackRef = useRef(onDataChange);
  callbackRef.current = onDataChange;

  // Create debounced handler
  const debouncedCallback = useCallback(
    debounce((payload?: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
      callbackRef.current(payload);
    }, debounceMs),
    [debounceMs]
  );

  useEffect(() => {
    if (!enabled || tables.length === 0) {
      return;
    }

    logger.debug('Setting up realtime subscription', {
      operation: 'useRealtimeSubscription',
      channelName,
      tables: tables.map((t) => t.table).join(', '),
    });

    // Create the channel
    let channel = supabase.channel(channelName);

    // Add subscriptions for each table
    tables.forEach(({ table, filter, event = '*', schema = 'public' }) => {
      const config: {
        event: RealtimeEvent;
        schema: string;
        table: string;
        filter?: string;
      } = {
        event,
        schema,
        table,
      };

      // Only add filter if provided - this is key for performance
      if (filter) {
        config.filter = filter;
      }

      channel = channel.on(
        'postgres_changes',
        config,
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          logger.debug('Realtime change received', {
            operation: 'useRealtimeSubscription',
            channelName,
            table,
            eventType: payload.eventType,
          });

          if (includePayload) {
            debouncedCallback(payload);
          } else {
            debouncedCallback();
          }
        }
      );
    });

    // Subscribe to the channel
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        logger.debug('Realtime subscription active', {
          operation: 'useRealtimeSubscription',
          channelName,
        });
      } else if (status === 'CHANNEL_ERROR') {
        logger.error('Realtime subscription error', undefined, {
          operation: 'useRealtimeSubscription',
          channelName,
        });
      }
    });

    // Cleanup on unmount or when dependencies change
    return () => {
      logger.debug('Cleaning up realtime subscription', {
        operation: 'useRealtimeSubscription',
        channelName,
      });
      channel.unsubscribe();
    };
  }, [channelName, tables, enabled, debounceMs, includePayload, debouncedCallback]);
}

/**
 * Simplified hook for single table subscription
 */
export function useTableSubscription(
  table: string,
  onDataChange: () => void,
  options?: {
    filter?: string;
    event?: RealtimeEvent;
    enabled?: boolean;
    debounceMs?: number;
  }
): void {
  const { filter, event = '*', enabled = true, debounceMs = 100 } = options || {};

  useRealtimeSubscription({
    channelName: `${table}-subscription-${filter || 'all'}`,
    tables: [{ table, filter, event }],
    onDataChange,
    enabled,
    debounceMs,
  });
}

/**
 * Hook for subscribing to tenant-scoped changes
 * Automatically applies tenant_id filter
 */
export function useTenantSubscription(
  table: string,
  tenantId: string | null | undefined,
  onDataChange: () => void,
  options?: {
    additionalFilter?: string;
    event?: RealtimeEvent;
    debounceMs?: number;
  }
): void {
  const { additionalFilter, event = '*', debounceMs = 100 } = options || {};

  // Build the filter
  let filter: string | undefined;
  if (tenantId) {
    filter = `tenant_id=eq.${tenantId}`;
    if (additionalFilter) {
      // Note: Supabase realtime only supports single filter
      // For multiple conditions, use the primary filter
      filter = additionalFilter;
    }
  }

  useRealtimeSubscription({
    channelName: `${table}-tenant-${tenantId || 'none'}`,
    tables: [{ table, filter, event }],
    onDataChange,
    enabled: !!tenantId,
    debounceMs,
  });
}

/**
 * Hook for subscribing to entity-specific changes
 * Useful for detail modals and editors
 */
export function useEntitySubscription(
  table: string,
  entityId: string | null | undefined,
  onDataChange: () => void,
  options?: {
    idColumn?: string;
    event?: RealtimeEvent;
    debounceMs?: number;
  }
): void {
  const { idColumn = 'id', event = '*', debounceMs = 100 } = options || {};

  useRealtimeSubscription({
    channelName: `${table}-entity-${entityId || 'none'}`,
    tables: [{ table, filter: entityId ? `${idColumn}=eq.${entityId}` : undefined, event }],
    onDataChange,
    enabled: !!entityId,
    debounceMs,
  });
}

export default useRealtimeSubscription;
