import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

/** The IANA timezone identifier for India. */
const IST_TZ = 'Asia/Kolkata';

/**
 * Return today's date at midnight in IST, as a dayjs object.
 *
 * Guarantees correctness across UTC/IST boundaries:
 * - If the server runs at 10:00 AM IST, UTC is 4:30 AM the same day.
 * - This function resolves to today's IST date, not yesterday's UTC date.
 *
 * Usage:
 *   todayIST().format('YYYY-MM-DD')   // "2026-06-22"
 */
export function todayIST(): dayjs.Dayjs {
  return dayjs().tz(IST_TZ).startOf('day');
}

/**
 * Return the calendar date string (YYYY-MM-DD) for a date that is `days`
 * away from today in IST.
 *
 * @param days  Positive = future, negative = past.
 */
export function dateInISTDays(days: number): string {
  return todayIST().add(days, 'day').format('YYYY-MM-DD');
}

/**
 * Compute the number of days between **today (IST midnight)** and the given
 * expiry date string.  Negative means the date has already passed.
 *
 * The calculation is purely calendar-based (no hours/minutes), so it's
 * immune to the exact time the server runs.
 *
 * @param expiryDateStr  An ISO date string or any value dayjs can parse,
 *                       e.g. "2026-07-15".
 */
export function daysUntil(expiryDateStr: string): number {
  const expiry = dayjs.tz(expiryDateStr, IST_TZ).startOf('day');
  return expiry.diff(todayIST(), 'day');
}