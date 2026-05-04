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
    .from("ristoranti")
    .select(
      "id, nome, indirizzo, citta, telefono, email, tipo_cucina, stato, users:gestore_id(email)",
    );
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(
      `nome.ilike.${like},citta.ilike.${like},tipo_cucina.ilike.${like}`,
    );
  }
  if (stato) query = query.eq("stato", stato);

  const { data } = await query.order("nome", { ascending: true });

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    nome: string;
    indirizzo: string;
    citta: string;
    telefono: string | null;
    email: string | null;
    tipo_cucina: string | null;
    stato: string;
    users: { email: string } | null;
  }>).map((r) => ({
    id: r.id,
    nome: r.nome,
    indirizzo: r.indirizzo,
    citta: r.citta,
    telefono: r.telefono ?? "",
    email: r.email ?? "",
    tipo_cucina: r.tipo_cucina ?? "",
    stato: r.stato,
    gestore_email: r.users?.email ?? "",
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "nome", header: "nome" },
    { key: "indirizzo", header: "indirizzo" },
    { key: "citta", header: "citta" },
    { key: "telefono", header: "telefono" },
    { key: "email", header: "email" },
    { key: "tipo_cucina", header: "tipo_cucina" },
    { key: "stato", header: "stato" },
    { key: "gestore_email", header: "gestore_email" },
  ]);

  return csvResponse(`ristoranti_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
