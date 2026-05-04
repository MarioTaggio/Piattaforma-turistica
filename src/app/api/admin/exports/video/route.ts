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
    .from("corsi")
    .select(
      "id, titolo, livello, prezzo_cents, durata_totale_secondi, stato, users:gestore_id(email)",
    );
  if (q) query = query.ilike("titolo", `%${q.replace(/[%_]/g, "")}%`);
  if (stato) query = query.eq("stato", stato);

  const { data } = await query.order("titolo", { ascending: true });

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    titolo: string;
    livello: string | null;
    prezzo_cents: number;
    durata_totale_secondi: number | null;
    stato: string;
    users: { email: string } | null;
  }>).map((c) => ({
    id: c.id,
    titolo: c.titolo,
    livello: c.livello ?? "",
    prezzo_eur: (c.prezzo_cents / 100).toFixed(2),
    durata_minuti: c.durata_totale_secondi
      ? Math.round(c.durata_totale_secondi / 60)
      : 0,
    stato: c.stato,
    gestore_email: c.users?.email ?? "",
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "titolo", header: "titolo" },
    { key: "livello", header: "livello" },
    { key: "prezzo_eur", header: "prezzo_eur" },
    { key: "durata_minuti", header: "durata_minuti" },
    { key: "stato", header: "stato" },
    { key: "gestore_email", header: "gestore_email" },
  ]);

  return csvResponse(`video_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
