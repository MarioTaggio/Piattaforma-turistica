import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponse, toCsv } from "@/lib/admin/csv";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("admin");
  const url = new URL(req.url);
  const stato = url.searchParams.get("stato");
  const pagamento = url.searchParams.get("pagamento");

  const supabase = createAdminClient();
  let query = supabase
    .from("ordini")
    .select(
      "id, created_at, totale_cents, tipo, stato, stato_pagamento, ristoranti:ristorante_id(nome), users:utente_id(email)",
    );
  if (stato) query = query.eq("stato", stato);
  if (pagamento) query = query.eq("stato_pagamento", pagamento);

  const { data } = await query.order("created_at", { ascending: false });

  const rows = ((data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    totale_cents: number;
    tipo: string;
    stato: string;
    stato_pagamento: string;
    ristoranti: { nome: string } | null;
    users: { email: string } | null;
  }>).map((o) => ({
    id: o.id,
    creato_il: o.created_at,
    cliente_email: o.users?.email ?? "",
    ristorante: o.ristoranti?.nome ?? "",
    tipo: o.tipo,
    stato: o.stato,
    stato_pagamento: o.stato_pagamento,
    totale_eur: (o.totale_cents / 100).toFixed(2),
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "creato_il", header: "creato_il" },
    { key: "cliente_email", header: "cliente_email" },
    { key: "ristorante", header: "ristorante" },
    { key: "tipo", header: "tipo" },
    { key: "stato", header: "stato" },
    { key: "stato_pagamento", header: "stato_pagamento" },
    { key: "totale_eur", header: "totale_eur" },
  ]);

  return csvResponse(`ordini_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
