/**
 * Returns a date relative to the reference date (now)
 * @param now Reference date
 * @param daysOffset Number of days to add (positive) or subtract (negative)
 * @param setTime Optional time string "HH:MM"
 */
export function getRelativeDate(now: Date, daysOffset: number, setTime?: string): Date {
    const date = new Date(now);
    date.setDate(date.getDate() + daysOffset);

    if (setTime) {
        const [hours, minutes] = setTime.split(':').map(Number);
        date.setHours(hours, minutes, 0, 0);
    }

    return date;
}

/**
 * Returns an ISO string date relative to the reference date
 */
export function getRelativeISO(now: Date, daysOffset: number, setTime?: string): string {
    return getRelativeDate(now, daysOffset, setTime).toISOString();
}

/**
 * Returns a random date between start and end days offset from now
 */
export function getRandomRelativeDate(now: Date, minDays: number, maxDays: number): Date {
    const range = maxDays - minDays;
    const days = minDays + Math.floor(Math.random() * range);
    return getRelativeDate(now, days);
}
