import { describe, expect, it } from 'vitest';
import { derivePilotActivation } from './usePilotActivation';

describe('derivePilotActivation', () => {
  it('is not pilot-ready for a fresh single-admin tenant', () => {
    const r = derivePilotActivation({
      pinOperatorCount: 0,
      profileOperatorCount: 0,
      pendingInviteCount: 0,
      assignmentCount: 0,
    });
    expect(r.hasOperator).toBe(false);
    expect(r.hasAssignment).toBe(false);
    expect(r.pilotReady).toBe(false);
  });

  it('counts a pending invite without marking pilot-ready', () => {
    const r = derivePilotActivation({
      pinOperatorCount: 0,
      profileOperatorCount: 0,
      pendingInviteCount: 1,
      assignmentCount: 0,
    });
    expect(r.hasPendingInvite).toBe(true);
    expect(r.hasOperator).toBe(false);
    expect(r.pilotReady).toBe(false);
  });

  it('is not pilot-ready with an operator but no assignment', () => {
    const r = derivePilotActivation({
      pinOperatorCount: 1,
      profileOperatorCount: 0,
      pendingInviteCount: 0,
      assignmentCount: 0,
    });
    expect(r.hasOperator).toBe(true);
    expect(r.hasAssignment).toBe(false);
    expect(r.pilotReady).toBe(false);
  });

  it('reaches the pilot-ready milestone with a PIN operator and an assignment', () => {
    const r = derivePilotActivation({
      pinOperatorCount: 1,
      profileOperatorCount: 0,
      pendingInviteCount: 0,
      assignmentCount: 2,
    });
    expect(r.pilotReady).toBe(true);
    expect(r.operatorCount).toBe(1);
    expect(r.assignmentCount).toBe(2);
  });

  it('treats invited operator profiles as operators', () => {
    const r = derivePilotActivation({
      pinOperatorCount: 0,
      profileOperatorCount: 1,
      pendingInviteCount: 0,
      assignmentCount: 1,
    });
    expect(r.operatorCount).toBe(1);
    expect(r.pilotReady).toBe(true);
  });
});
