import { isPast, differenceInDays, startOfDay } from "date-fns";

export type DueUrgency = "overdue" | "today" | "soon" | "normal" | "none";

/**
 * Determine the urgency level of a due date.
 * - overdue: past due
 * - today: due today
 * - soon: due within 3 days
 * - normal: due later
 * - none: no valid date
 */
export function getDueUrgency(
  dateValue: string | null | undefined,
): DueUrgency {
  if (!dateValue) return "none";
  const date = new Date(dateValue);
  if (!Number.isFinite(date.getTime())) return "none";

  const today = startOfDay(new Date());
  const dueDay = startOfDay(date);
  const daysUntilDue = differenceInDays(dueDay, today);

  if (isPast(dueDay) && daysUntilDue < 0) return "overdue";
  if (daysUntilDue === 0) return "today";
  if (daysUntilDue <= 3) return "soon";
  return "normal";
}

/** Text color class for due date urgency */
export const dueUrgencyTextClass: Record<DueUrgency, string> = {
  overdue: "text-red-600 dark:text-red-400",
  today: "text-amber-600 dark:text-amber-400",
  soon: "text-orange-600 dark:text-orange-400",
  normal: "text-muted-foreground",
  none: "text-muted-foreground",
};

/** Background color class for due date urgency (subtle) */
export const dueUrgencyBgClass: Record<DueUrgency, string> = {
  overdue: "bg-red-500/10",
  today: "bg-amber-500/10",
  soon: "bg-orange-500/10",
  normal: "",
  none: "",
};

/** Border color class for due date urgency */
export const dueUrgencyBorderClass: Record<DueUrgency, string> = {
  overdue: "border-red-400/40",
  today: "border-amber-400/40",
  soon: "border-orange-400/30",
  normal: "border-border/60",
  none: "border-border/60",
};
