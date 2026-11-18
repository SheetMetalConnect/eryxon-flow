import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

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

export function useRealtimeSubscription({
  channelName,
  tables,
  onDataChange,
  enabled = true,
  debounceMs = 100,
  includePayload = false,
}: RealtimeSubscriptionOptions): void {
  const callbackRef = useRef(onDataChange);
  useEffect(() => { callbackRef.current = onDataChange; }, [onDataChange]);

  // Subscription identity depends on values, not freshly allocated caller arrays.
  const tableKey = JSON.stringify(tables.map(({ table, filter, event = '*', schema = 'public' }) =>
    ({ table, filter, event, schema }),
  ));

  useEffect(() => {
    const subscriptions: TableSubscription[] = JSON.parse(tableKey);
    if (!enabled || subscriptions.length === 0) return;

    let pending: ReturnType<typeof setTimeout> | undefined;
    const channel = supabase.channel(channelName);
    for (const { table, filter, event, schema } of subscriptions) {
      const config = { table, schema, ...(filter ? { filter } : {}) };
      const handleChange = (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
        clearTimeout(pending);
        pending = setTimeout(() => {
          callbackRef.current(includePayload ? payload : undefined);
        }, debounceMs);
      };
      switch (event) {
        case 'INSERT': channel.on('postgres_changes', { ...config, event: 'INSERT' }, handleChange); break;
        case 'UPDATE': channel.on('postgres_changes', { ...config, event: 'UPDATE' }, handleChange); break;
        case 'DELETE': channel.on('postgres_changes', { ...config, event: 'DELETE' }, handleChange); break;
        default: channel.on('postgres_changes', { ...config, event: '*' }, handleChange);
      }
    }
    channel.subscribe();

    return () => {
      clearTimeout(pending);
      void supabase.removeChannel(channel);
    };
  }, [channelName, tableKey, enabled, debounceMs, includePayload]);
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
