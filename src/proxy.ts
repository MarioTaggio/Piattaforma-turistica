import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

// Routes that require an authenticated session.
const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/profilo"];

// Auth pages — already-authenticated users get bounced back to /dashboard.
const AUTH_PREFIXES = ["/login", "/register", "/reset-password"];

// Eccezioni al bounce: pagine sotto un AUTH_PREFIX a cui un utente già loggato
// DEVE poter accedere. /reset-password/confirm: arriva qui dal recovery link
// email — verifyOtp() lo autentica, ma deve poter completare il reset password
// invece di essere rispedito al dashboard.
const AUTH_BOUNCE_EXCEPTIONS = ["/reset-password/confirm"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function proxy(request: NextRequest) {
  // 1. Refresh the Supabase session cookie. This must run on every request
  //    so that getUser() in Server Components sees a fresh access token.
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT (per @supabase/ssr docs): always call getUser() — never trust
  // getSession() in server code, since it does not validate the JWT.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Optimistic redirects. We only check the cookie's user, not the DB —
  //    role-level guards happen in the (dashboard) layout via the DAL.
  const { pathname } = request.nextUrl;

  if (!user && startsWithAny(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (
    user &&
    startsWithAny(pathname, AUTH_PREFIXES) &&
    !startsWithAny(pathname, AUTH_BOUNCE_EXCEPTIONS)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // Onboarding gate: utente loggato che entra nella dashboard senza
  // aver completato l'onboarding (username/telefono mancanti) viene
  // dirottato a /onboarding. /onboarding stesso e i logout sono esclusi.
  if (
    user &&
    startsWithAny(pathname, PROTECTED_PREFIXES) &&
    !pathname.startsWith("/onboarding")
  ) {
    const { data: profile } = await supabase
      .from("users")
      .select("username, telefono, onboarding_completato")
      .eq("id", user.id)
      .maybeSingle();
    const p = (profile ?? null) as {
      username: string | null;
      telefono: string | null;
      onboarding_completato: boolean | null;
    } | null;
    if (
      p &&
      !p.onboarding_completato &&
      (!p.username || !p.telefono)
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  // Run on every request EXCEPT static assets, image optimisation, and
  // the favicon — auth checks for those are noise.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
