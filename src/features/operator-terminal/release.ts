export const SEQUENTIAL_RELEASE_FEATURE_FLAG_KEY = "sequentialRelease";

interface Step {
  part: { id: string };
  sequence: number;
  status: string;
}

// Released = every earlier step of the same part is completed.
export function isReleased(operation: Step, all: Step[]) {
  return !all.some(
    (other) =>
      other.part.id === operation.part.id &&
      other.sequence < operation.sequence &&
      other.status !== "completed",
  );
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
