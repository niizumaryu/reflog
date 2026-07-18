// Every write helper (matches.ts, schedules.ts, profile.ts, ...) throws this
// exact Japanese message when supabase.auth.getUser() comes back empty. Page
// routes are already gated by src/proxy.ts, so hitting this while a form is
// mounted almost always means the session expired *during* the visit (not
// that the user was never logged in) — the caller needs a distinct "your
// session expired, please log back in" UI instead of a generic error string.
const SESSION_EXPIRED_MESSAGE = "ログインが必要です";

export function isSessionExpiredError(message: string | null | undefined): boolean {
  return message === SESSION_EXPIRED_MESSAGE;
}
