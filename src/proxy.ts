import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/reset-password",
  "/update-password",
  "/terms",
  "/privacy",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Every API route authenticates itself (supabase.auth.getUser() + a JSON
  // 401, or CRON_SECRET for the cron route) and must never fall through to
  // the redirect-to-/login below. A fetch() call follows a 302 redirect
  // transparently: the caller would see `ok: true` and an HTML login page
  // body instead of the 401 JSON it expects, so e.g. an expired session
  // during "delete account" would silently no-op instead of failing
  // visibly. Page routes still go through the redirect below.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  let user = null;
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser();
    user = fetchedUser;
  } catch (error) {
    console.error("Proxy: failed to resolve Supabase session:", error);
  }

  const isPublicPath =
    PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/");

  if (!user && !isPublicPath) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest).*)",
  ],
};
