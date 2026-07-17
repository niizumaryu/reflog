// Validates a user-supplied "next" redirect target before it's ever handed
// to NextResponse.redirect() or router.push(). Both /auth/callback and
// /login accept a `next` query param that round-trips through Supabase's
// email/OAuth redirect URLs, so it's attacker-controllable: a link like
// `/auth/callback?code=...&next=https://evil.example` would otherwise pass
// straight through `new URL(next, request.url)`, which — because `next` is
// absolute — ignores the base and redirects off-site (open redirect), while
// still showing the trusted reflog domain in the initial link.
//
// Only same-origin, path-only targets are allowed: must start with a single
// "/" (a relative path) and never "//" or "/\" (browsers treat both as a
// protocol-relative URL to another host, e.g. "//evil.example").
export function isSafeRedirectPath(path: string | null | undefined): path is string {
  if (!path) return false;
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.startsWith("/\\")) return false;
  return true;
}

export function sanitizeRedirectPath(
  path: string | null | undefined,
  fallback = "/",
): string {
  return isSafeRedirectPath(path) ? path : fallback;
}
