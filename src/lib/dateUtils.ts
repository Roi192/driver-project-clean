/**
 * Date utilities for Israel (Asia/Jerusalem) timezone.
 *
 * Key rules:
 *  - "shift date" is always an Israeli calendar date (YYYY-MM-DD) — no UTC conversion.
 *  - toISOString() returns UTC and must NOT be used to derive a local calendar date.
 *  - DATE-only strings ("YYYY-MM-DD") must be parsed as local midnight, not UTC midnight.
 */

/** Returns today's date as "YYYY-MM-DD" in Asia/Jerusalem timezone. */
export function todayIsrael(): string {
  // en-CA locale formats as YYYY-MM-DD — clean ISO date without time.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jerusalem" }).format(new Date());
}

/**
 * Converts a Date object to "YYYY-MM-DD" using its local calendar components.
 * For Israeli users (device timezone = Asia/Jerusalem) this equals the Israeli date.
 * Use this instead of toISOString().split("T")[0].
 */
export function toLocalDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Parses a DATE-only string ("YYYY-MM-DD") as local midnight.
 * The ECMAScript spec parses date-only ISO strings as UTC midnight, which shifts
 * the displayed date by 2–3 hours in Israel. Appending "T00:00:00" forces local parsing.
 */
export function parseDateStr(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  // Already has a time component → parse as-is
  if (dateStr.includes("T") || dateStr.includes(" ")) return new Date(dateStr);
  return new Date(dateStr + "T00:00:00");
}
