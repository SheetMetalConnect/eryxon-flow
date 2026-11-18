import type { TFunction } from "i18next";

/**
 * Resource status presentation, shared by the admin operation modal and the
 * terminal resources panel. Both previously kept their own copies of these
 * mappings; keep them here so the two surfaces can't drift apart.
 */

/** Outline-badge classes per resource status (admin operation modal). */
export const resourceStatusBadgeClass: Record<string, string> = {
  available:
    "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800",
  in_use:
    "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
  maintenance:
    "text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
  retired: "text-muted-foreground bg-muted/50 border-muted",
};

/** Inline text classes per resource status (terminal resources panel). */
export function resourceStatusTextClass(status?: string | null): string {
  switch (status) {
    case "available":
      return "text-emerald-600 dark:text-emerald-400";
    case "in_use":
      return "text-amber-600 dark:text-amber-400";
    case "maintenance":
      return "text-red-600 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

/** Translated label for a resource status; falls back to the raw value. */
export function resourceStatusLabel(
  t: TFunction,
  status?: string | null,
): string {
  switch (status) {
    case "available":
      return t("terminal.resources.status.available");
    case "in_use":
      return t("terminal.resources.status.inUse");
    case "maintenance":
      return t("terminal.resources.status.maintenance");
    case "retired":
      return t("terminal.resources.status.retired");
    default:
      return status ?? "";
  }
}
