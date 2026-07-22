// REFLOG has no per-user timezone setting: every date the user types in
// (match date, schedule date) is a JST wall-clock date with no explicit
// zone, and JST is what every user of this app is assumed to be in. Any
// code that needs "what is today's date" as a plain YYYY-MM-DD string to
// compare against those stored dates must derive it from JST, not from
// `Date.toISOString()` (UTC) — from local midnight until ~09:00 JST, the
// UTC calendar date is still "yesterday", which silently shifts "today"/
// "tomorrow" comparisons by one day during that window.
export function jstDateString(date: Date = new Date()): string {
  // en-CA gives an unambiguous YYYY-MM-DD format.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tokyo" }).format(date);
}

// Same JST-is-the-only-timezone assumption as jstDateString above, but in
// the other direction: given a JST wall-clock date + hour + minute (as
// typed into a schedule form), returns the UTC instant it corresponds to.
// JST is a fixed UTC+9 offset (no DST), so this is a plain arithmetic
// conversion rather than an Intl lookup.
export function jstWallClockToUtcMs(dateStr: string, hour: number, minute: number): number {
  return Date.parse(`${dateStr}T00:00:00Z`) + (hour * 60 + minute) * 60_000 - 9 * 60 * 60_000;
}
