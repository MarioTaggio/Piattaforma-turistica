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
    .from("strutture")
    .select(
      "id, nome, indirizzo, citta, cap, stelle, stato, gestore_id, users:gestore_id(email)",
    );
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`nome.ilike.${like},citta.ilike.${like}`);
  }
  if (stato) query = query.eq("stato", stato);

  const { data } = await query.order("nome", { ascending: true });

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    nome: string;
    indirizzo: string;
    citta: string;
    cap: string | null;
    stelle: number | null;
    stato: string;
    users: { email: string } | null;
  }>).map((s) => ({
    id: s.id,
    nome: s.nome,
    indirizzo: s.indirizzo,
    citta: s.citta,
    cap: s.cap ?? "",
    stelle: s.stelle ?? "",
    stato: s.stato,
    gestore_email: s.users?.email ?? "",
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "nome", header: "nome" },
    { key: "indirizzo", header: "indirizzo" },
    { key: "citta", header: "citta" },
    { key: "cap", header: "cap" },
    { key: "stelle", header: "stelle" },
    { key: "stato", header: "stato" },
    { key: "gestore_email", header: "gestore_email" },
  ]);

  return csvResponse(`bnb_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
