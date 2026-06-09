/**
 * Shared time formatting helpers.
 *
 * These existed as per-component copies (SessionTrackingBar, time-picker,
 * datetime-picker, NotificationsCenter, OrganizationSettings) before being
 * centralized here. Add new time formatting here rather than inline.
 */

/** Elapsed seconds → compact timer string: 45 → "0:45", 3725 → "1:02:05". */
export function formatElapsedSeconds(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = Math.floor(totalSeconds % 60);

  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

/** Wall-clock time of a Date — 24h ("14:05") or 12h ("02:05 PM"). */
export function formatClockTime(date: Date, use24Hour: boolean): string {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  if (use24Hour) {
    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }
  const period = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${minutes} ${period}`;
}

/**
 * Locale-aware relative time: "now", "5 min. ago", "vor 3 Std.",
 * "2 dagen geleden". Pass the active i18n language so operator-facing
 * timestamps follow the UI locale instead of hardcoded English. Narrow
 * style keeps the strings short enough for compact timestamp rows.
 */
export function formatRelativeTime(date: string | Date, locale?: string): string {
  const then = typeof date === "string" ? new Date(date) : date;
  const diffMs = then.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(locale, {
    numeric: "auto",
    style: "narrow",
  });

  if (abs < 60_000) return rtf.format(0, "second");
  if (abs < 3_600_000) return rtf.format(Math.trunc(diffMs / 60_000), "minute");
  if (abs < 86_400_000) return rtf.format(Math.trunc(diffMs / 3_600_000), "hour");
  return rtf.format(Math.trunc(diffMs / 86_400_000), "day");
}

/** Database time ("HH:MM:SS") → `<input type="time">` value ("HH:MM"). */
export function toTimeInputValue(time: string | null | undefined): string {
  return time ? time.substring(0, 5) : "";
}
