import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponse, toCsv } from "@/lib/admin/csv";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("admin");
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const dispRaw = url.searchParams.get("disponibile");

  const supabase = createAdminClient();
  let query = supabase
    .from("shop_prodotti")
    .select(
      "id, nome, categoria, prezzo_cents, disponibile, shops:shop_id(nome, users:gestore_id(email))",
    );
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`nome.ilike.${like},categoria.ilike.${like}`);
  }
  if (dispRaw === "true") query = query.eq("disponibile", true);
  if (dispRaw === "false") query = query.eq("disponibile", false);

  const { data } = await query.order("nome", { ascending: true });

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    nome: string;
    categoria: string | null;
    prezzo_cents: number;
    disponibile: boolean;
    shops: { nome: string; users: { email: string } | null } | null;
  }>).map((p) => ({
    id: p.id,
    nome: p.nome,
    categoria: p.categoria ?? "",
    prezzo_eur: (p.prezzo_cents / 100).toFixed(2),
    disponibile: p.disponibile ? "si" : "no",
    shop: p.shops?.nome ?? "",
    gestore_email: p.shops?.users?.email ?? "",
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "nome", header: "nome" },
    { key: "categoria", header: "categoria" },
    { key: "prezzo_eur", header: "prezzo_eur" },
    { key: "disponibile", header: "disponibile" },
    { key: "shop", header: "shop" },
    { key: "gestore_email", header: "gestore_email" },
  ]);

  return csvResponse(`shop_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
