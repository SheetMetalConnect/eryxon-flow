import { parseISO } from 'date-fns';

/** Interpret a business date's calendar portion in the browser's local timezone. */
export function parseDateOnly(value: string): Date {
  return parseISO(value.slice(0, 10));
}
