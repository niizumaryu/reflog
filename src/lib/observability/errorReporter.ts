// Minimal, dependency-free error-reporting seam. Today this only logs to
// the console (same as every catch block already in this codebase), but it
// gives every call site a single, stable import to swap for a real error
// tracker (Sentry etc.) later — see docs/observability.md for the exact
// steps and what NOT to send (video URLs, auth tokens, memo/goodPoints/
// improvements free-text, email addresses).
//
// `context` must stay limited to non-identifying, non-sensitive metadata
// (a route name, a status code, an operation name) — never raw user input
// or tokens. Treat it the same as a log line.
export function reportError(error: unknown, context?: Record<string, string | number | boolean>): void {
  if (context) {
    console.error(error, context);
  } else {
    console.error(error);
  }
}
