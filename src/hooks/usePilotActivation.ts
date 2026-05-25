import { useCallback, useEffect, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

/**
 * Derived "managed pilot" activation state for the current tenant.
 *
 * The guided pilot path (ERY-36) turns single-admin demo exploration into a
 * repeatable flow: add a teammate or no-email operator -> assign an operation ->
 * operator picks the work up. A tenant is considered pilot-ready once it has at
 * least one operator (PIN-based shop-floor operator OR invited operator profile)
 * AND at least one active operation assignment.
 *
 * The signal prefers the persisted tenant milestone, then falls back to current
 * operator/assignment-derived state when needed.
 */
export interface PilotActivationState {
  loading: boolean;
  /** PIN-based operators + invited operator profiles. */
  operatorCount: number;
  /** Pending teammate invitations that have not been accepted yet. */
  pendingInviteCount: number;
  /** Active operation assignments. */
  assignmentCount: number;
  /** Timestamp when tenant first reached pilot-ready milestone. */
  pilotActivatedAt: string | null;
  /** At least one operator exists (the operator step is satisfiable). */
  hasOperator: boolean;
  /** An invitation has been sent but not yet accepted. */
  hasPendingInvite: boolean;
  /** At least one operation has been assigned. */
  hasAssignment: boolean;
  /** Tenant reached the pilot-ready milestone: an operator has assigned work. */
  pilotReady: boolean;
  refetch: () => void;
}

export interface PilotActivationCounts {
  /** PIN-based shop-floor operators (active). */
  pinOperatorCount: number;
  /** Invited operator profiles (active). */
  profileOperatorCount: number;
  /** Pending (not yet accepted) teammate invitations. */
  pendingInviteCount: number;
  /** Active operation assignments. */
  assignmentCount: number;
  /** Persisted tenant milestone (null until first qualifying assignment). */
  pilotActivatedAt: string | null;
}

type DerivedPilotActivation = Omit<PilotActivationState, 'loading' | 'refetch'>;

/**
 * Pure milestone derivation, isolated for testing. A tenant is pilot-ready once
 * it has at least one operator AND at least one active operation assignment.
 */
export function derivePilotActivation(counts: PilotActivationCounts): DerivedPilotActivation {
  const operatorCount = counts.pinOperatorCount + counts.profileOperatorCount;
  const hasOperator = operatorCount > 0;
  const hasAssignment = counts.assignmentCount > 0;
  const pilotReady = hasOperator && hasAssignment;
  return {
    operatorCount,
    pendingInviteCount: counts.pendingInviteCount,
    assignmentCount: counts.assignmentCount,
    pilotActivatedAt: counts.pilotActivatedAt,
    hasOperator,
    hasPendingInvite: counts.pendingInviteCount > 0,
    hasAssignment,
    pilotReady: pilotReady || Boolean(counts.pilotActivatedAt),
  };
}

const INITIAL: Omit<PilotActivationState, 'refetch'> = {
  loading: true,
  operatorCount: 0,
  pendingInviteCount: 0,
  assignmentCount: 0,
  pilotActivatedAt: null,
  hasOperator: false,
  hasPendingInvite: false,
  hasAssignment: false,
  pilotReady: false,
};

export function usePilotActivation(): PilotActivationState {
  const profile = useProfile();
  const tenantId = profile?.tenant_id;
  const [state, setState] = useState(INITIAL);

  const load = useCallback(async () => {
    if (!tenantId) return;

    setState((prev) => (prev.loading ? prev : { ...prev, loading: true }));

    try {
      const [pinOps, profileOps, invites, assignments, tenantMilestone] = await Promise.all([
        supabase
          .from('operators')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('active', true),
        supabase
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('role', 'operator')
          .eq('active', true)
          .eq('is_machine', false),
        supabase
          .from('invitations')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'pending'),
        supabase
          .from('assignments')
          .select('id', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', 'assigned'),
        supabase
          .from('tenants')
          .select('pilot_ready_at')
          .eq('id', tenantId)
          .single(),
      ]);

      const derived = derivePilotActivation({
        pinOperatorCount: pinOps.count || 0,
        profileOperatorCount: profileOps.count || 0,
        pendingInviteCount: invites.count || 0,
        assignmentCount: assignments.count || 0,
        pilotActivatedAt: (tenantMilestone.data as { pilot_ready_at?: string | null } | null)
          ?.pilot_ready_at || null,
      });

      setState({ loading: false, ...derived });
    } catch (error) {
      logger.error('usePilotActivation', 'Failed to load pilot activation state', error);
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) return;
    // Mount/tenant-change fetch; load() manages its own loading flag.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [tenantId, load]);

  return { ...state, refetch: load };
}
