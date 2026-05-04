import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponse, toCsv } from "@/lib/admin/csv";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("admin");
  const url = new URL(req.url);
  const stato = url.searchParams.get("stato");

  const supabase = createAdminClient();
  let query = supabase
    .from("biglietti")
    .select(
      "id, codice, created_at, prezzo_pagato_cents, stato, eventi:evento_id(titolo, data_inizio), users:utente_id(email)",
    );
  if (stato) query = query.eq("stato", stato);

  const { data } = await query.order("created_at", { ascending: false });

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    codice: string;
    created_at: string;
    prezzo_pagato_cents: number;
    stato: string;
    eventi: { titolo: string; data_inizio: string } | null;
    users: { email: string } | null;
  }>).map((b) => ({
    id: b.id,
    codice: b.codice,
    creato_il: b.created_at,
    cliente_email: b.users?.email ?? "",
    evento: b.eventi?.titolo ?? "",
    data_evento: b.eventi?.data_inizio ?? "",
    prezzo_eur: (b.prezzo_pagato_cents / 100).toFixed(2),
    stato: b.stato,
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "codice", header: "codice" },
    { key: "creato_il", header: "creato_il" },
    { key: "cliente_email", header: "cliente_email" },
    { key: "evento", header: "evento" },
    { key: "data_evento", header: "data_evento" },
    { key: "prezzo_eur", header: "prezzo_eur" },
    { key: "stato", header: "stato" },
  ]);

  return csvResponse(`biglietti_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
