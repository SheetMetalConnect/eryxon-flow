import { format, parseISO } from 'date-fns';

/** Interpret a business date's calendar portion in the browser's local timezone. */
export function parseDateOnly(value: string): Date {
  return parseISO(value.slice(0, 10));
}

/** Serialize a calendar selection without changing its local calendar day. */
export function serializeDateOnly(value: Date): string {
  return `${format(value, 'yyyy-MM-dd')}T00:00:00.000Z`;
}
