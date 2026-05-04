import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponse, toCsv } from "@/lib/admin/csv";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("admin");
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const stato = url.searchParams.get("stato");

  const supabase = createAdminClient();
  let query = supabase
    .from("eventi")
    .select(
      "id, titolo, citta, luogo, data_inizio, data_fine, prezzo_cents, posti_totali, posti_disponibili, stato, gestore_id, users:gestore_id(email)",
    );
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`titolo.ilike.${like},citta.ilike.${like}`);
  }
  if (stato) query = query.eq("stato", stato);
  const { data } = await query.order("data_inizio", { ascending: false });

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    titolo: string;
    citta: string | null;
    luogo: string;
    data_inizio: string;
    data_fine: string;
    prezzo_cents: number;
    posti_totali: number;
    posti_disponibili: number;
    stato: string;
    gestore_id: string;
    users: { email: string } | null;
  }>).map((e) => ({
    id: e.id,
    titolo: e.titolo,
    luogo: e.luogo,
    citta: e.citta ?? "",
    data_inizio: e.data_inizio,
    data_fine: e.data_fine,
    prezzo_eur: (e.prezzo_cents / 100).toFixed(2),
    posti_totali: e.posti_totali,
    posti_venduti: e.posti_totali - e.posti_disponibili,
    stato: e.stato,
    gestore_email: e.users?.email ?? "",
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "titolo", header: "titolo" },
    { key: "luogo", header: "luogo" },
    { key: "citta", header: "citta" },
    { key: "data_inizio", header: "data_inizio" },
    { key: "data_fine", header: "data_fine" },
    { key: "prezzo_eur", header: "prezzo_eur" },
    { key: "posti_totali", header: "posti_totali" },
    { key: "posti_venduti", header: "posti_venduti" },
    { key: "stato", header: "stato" },
    { key: "gestore_email", header: "gestore_email" },
  ]);

  return csvResponse(`eventi_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
