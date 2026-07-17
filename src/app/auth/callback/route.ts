import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sanitizeRedirectPath } from "@/lib/safeRedirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  // `next` is attacker-controllable (it round-trips through the email/OAuth
  // redirect URL), so it must be a same-origin path, never an absolute URL —
  // see src/lib/safeRedirect.ts for why.
  const next = sanitizeRedirectPath(request.nextUrl.searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
