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
    .from("attrazioni")
    .select(
      "id, nome, indirizzo, citta, categoria, stato, users:gestore_id(email)",
    );
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(
      `nome.ilike.${like},citta.ilike.${like},categoria.ilike.${like}`,
    );
  }
  if (stato) query = query.eq("stato", stato);

  const { data } = await query.order("nome", { ascending: true });

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    nome: string;
    indirizzo: string;
    citta: string;
    categoria: string | null;
    stato: string;
    users: { email: string } | null;
  }>).map((a) => ({
    id: a.id,
    nome: a.nome,
    indirizzo: a.indirizzo,
    citta: a.citta,
    categoria: a.categoria ?? "",
    stato: a.stato,
    gestore_email: a.users?.email ?? "",
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "nome", header: "nome" },
    { key: "indirizzo", header: "indirizzo" },
    { key: "citta", header: "citta" },
    { key: "categoria", header: "categoria" },
    { key: "stato", header: "stato" },
    { key: "gestore_email", header: "gestore_email" },
  ]);

  return csvResponse(`infopoint_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
