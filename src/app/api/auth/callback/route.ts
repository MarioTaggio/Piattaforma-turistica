import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// Supabase redirects here after email confirmation, magic-link, OAuth, or
// password recovery. Supporta entrambi i formati:
//   - Vecchio: ?code=... → exchangeCodeForSession
//   - Nuovo:   ?token_hash=...&type=... → verifyOtp (richiesto per i recovery
//              link recenti, che non hanno più `code`).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next =
    searchParams.get("next") ??
    (type === "recovery" ? "/reset-password/confirm" : "/dashboard");

  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
