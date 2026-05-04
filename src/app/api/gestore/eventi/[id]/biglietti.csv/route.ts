import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { csvResponse, toCsv } from "@/lib/admin/csv";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requireRole("gestore_eventi");
  const { id } = await params;
  const supabase = await createClient();

  const { data: evento } = await supabase
    .from("eventi")
    .select("titolo, gestore_id")
    .eq("id", id)
    .single();
  if (!evento)
    return new Response("Evento non trovato", { status: 404 });
  const e = evento as { titolo: string; gestore_id: string };
  if (e.gestore_id !== user.id && !user.roles.includes("admin"))
    return new Response("Forbidden", { status: 403 });

  const { data } = await supabase
    .from("biglietti")
    .select(
      "id, codice, stato, prezzo_pagato_cents, created_at, utilizzato_at, users:utente_id ( nome, cognome, email )",
    )
    .eq("evento_id", id)
    .order("created_at", { ascending: false });

  type Row = {
    id: string;
    codice: string;
    stato: string;
    prezzo_pagato_cents: number;
    created_at: string;
    utilizzato_at: string | null;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  };

  const rows = ((data ?? []) as unknown as Row[]).map((b) => ({
    id: b.id,
    codice: b.codice,
    nome: b.users?.nome ?? "",
    cognome: b.users?.cognome ?? "",
    email: b.users?.email ?? "",
    stato: b.stato,
    prezzo_eur: (b.prezzo_pagato_cents / 100).toFixed(2),
    acquistato: b.created_at,
    utilizzato: b.utilizzato_at ?? "",
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "codice", header: "codice" },
    { key: "nome", header: "nome" },
    { key: "cognome", header: "cognome" },
    { key: "email", header: "email" },
    { key: "stato", header: "stato" },
    { key: "prezzo_eur", header: "prezzo_eur" },
    { key: "acquistato", header: "acquistato" },
    { key: "utilizzato", header: "utilizzato" },
  ]);

  const slug = e.titolo
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return csvResponse(
    `biglietti-${slug}-${new Date().toISOString().slice(0, 10)}.csv`,
    csv,
  );
}
