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
