export const SEQUENTIAL_RELEASE_FEATURE_FLAG_KEY = "sequentialRelease";

interface Step {
  part: { id: string };
  sequence: number;
  status: string;
}

export type OperationFlowState = 'active' | 'on_hold' | 'in_buffer' | 'expected' | 'completed';

// Released = every earlier step of the same part is completed.
export function isReleased(operation: Step, all: Step[]) {
  return !all.some(
    (other) =>
      other.part.id === operation.part.id &&
      other.sequence < operation.sequence &&
      other.status !== "completed",
  );
}

export function deriveOperationFlowState(operation: Step, all: Step[]): OperationFlowState {
  if (operation.status === 'completed') return 'completed';
  if (operation.status === 'in_progress') return 'active';
  if (operation.status === 'on_hold') return 'on_hold';
  return isReleased(operation, all) ? 'in_buffer' : 'expected';
}

export function getSequentialReleaseSetting(featureFlags: unknown) {
  return Boolean((featureFlags as Record<string, unknown> | null)?.[SEQUENTIAL_RELEASE_FEATURE_FLAG_KEY]);
}

export function mergeSequentialReleaseSetting(featureFlags: unknown, enabled: boolean) {
  const base = featureFlags && typeof featureFlags === "object" && !Array.isArray(featureFlags)
    ? (featureFlags as Record<string, unknown>)
    : {};
  return { ...base, [SEQUENTIAL_RELEASE_FEATURE_FLAG_KEY]: enabled };
}
