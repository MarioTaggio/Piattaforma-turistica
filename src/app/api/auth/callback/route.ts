import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after email confirmation, magic-link, OAuth, or
// password recovery. We exchange the `code` for a session (which writes the
// auth cookie) and then bounce the user to `next` (or /dashboard).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next =
    searchParams.get("next") ??
    (type === "recovery" ? "/reset-password/confirm" : "/dashboard");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
