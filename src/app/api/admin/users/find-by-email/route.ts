import { NextResponse } from "next/server";

import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  await requireRole("admin");

  const body = (await req.json().catch(() => null)) as
    | { email?: string }
    | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email mancante" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data)
    return NextResponse.json(
      { error: "Nessun utente con questa email" },
      { status: 404 },
    );

  return NextResponse.json({ id: (data as { id: string }).id });
}
