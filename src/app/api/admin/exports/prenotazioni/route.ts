import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponse, toCsv } from "@/lib/admin/csv";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("admin");
  const url = new URL(req.url);
  const tipo = url.searchParams.get("tipo");
  const stato = url.searchParams.get("stato");

  const supabase = createAdminClient();

  const wantBnb = !tipo || tipo === "bnb";
  const wantTavolo = !tipo || tipo === "tavolo";
  const wantVisita = !tipo || tipo === "visita";

  async function fetchBnb() {
    if (!wantBnb) return { data: [] as unknown[] };
    let q = supabase
      .from("prenotazioni_bnb")
      .select(
        "id, created_at, data_check_in, data_check_out, prezzo_totale_cents, stato, num_ospiti, users:utente_id(email), camere:camera_id(strutture:struttura_id(nome))",
      );
    if (stato) q = q.eq("stato", stato);
    return q.order("created_at", { ascending: false });
  }
  async function fetchTavolo() {
    if (!wantTavolo) return { data: [] as unknown[] };
    let q = supabase
      .from("prenotazioni_tavolo")
      .select(
        "id, created_at, data_ora, num_ospiti, stato, users:utente_id(email), tavoli:tavolo_id(numero, ristoranti:ristorante_id(nome))",
      );
    if (stato) q = q.eq("stato", stato);
    return q.order("created_at", { ascending: false });
  }
  async function fetchVisita() {
    if (!wantVisita) return { data: [] as unknown[] };
    let q = supabase
      .from("prenotazioni_visita")
      .select(
        "id, created_at, num_partecipanti, prezzo_totale_cents, stato, users:utente_id(email), visite_guidate:visita_id(titolo, data_ora)",
      );
    if (stato) q = q.eq("stato", stato);
    return q.order("created_at", { ascending: false });
  }

  const [bnb, tavolo, visita] = await Promise.all([
    fetchBnb(),
    fetchTavolo(),
    fetchVisita(),
  ]);

  type Out = {
    tipo: string;
    id: string;
    creata_il: string;
    utente_email: string;
    oggetto: string;
    quando: string;
    num: number;
    totale_eur: string;
    stato: string;
  };
  const rows: Out[] = [];

  for (const r of (bnb.data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    data_check_in: string;
    data_check_out: string;
    prezzo_totale_cents: number;
    num_ospiti: number;
    stato: string;
    users: { email: string } | null;
    camere: { strutture: { nome: string } | null } | null;
  }>) {
    rows.push({
      tipo: "bnb",
      id: r.id,
      creata_il: r.created_at,
      utente_email: r.users?.email ?? "",
      oggetto: r.camere?.strutture?.nome ?? "",
      quando: `${r.data_check_in} → ${r.data_check_out}`,
      num: r.num_ospiti,
      totale_eur: (r.prezzo_totale_cents / 100).toFixed(2),
      stato: r.stato,
    });
  }
  for (const r of (tavolo.data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    data_ora: string;
    num_ospiti: number;
    stato: string;
    users: { email: string } | null;
    tavoli: { numero: string; ristoranti: { nome: string } | null } | null;
  }>) {
    rows.push({
      tipo: "tavolo",
      id: r.id,
      creata_il: r.created_at,
      utente_email: r.users?.email ?? "",
      oggetto: `${r.tavoli?.ristoranti?.nome ?? ""} · ${r.tavoli?.numero ?? ""}`,
      quando: r.data_ora,
      num: r.num_ospiti,
      totale_eur: "",
      stato: r.stato,
    });
  }
  for (const r of (visita.data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    num_partecipanti: number;
    prezzo_totale_cents: number;
    stato: string;
    users: { email: string } | null;
    visite_guidate: { titolo: string; data_ora: string } | null;
  }>) {
    rows.push({
      tipo: "visita",
      id: r.id,
      creata_il: r.created_at,
      utente_email: r.users?.email ?? "",
      oggetto: r.visite_guidate?.titolo ?? "",
      quando: r.visite_guidate?.data_ora ?? "",
      num: r.num_partecipanti,
      totale_eur: (r.prezzo_totale_cents / 100).toFixed(2),
      stato: r.stato,
    });
  }

  rows.sort((a, b) => +new Date(b.creata_il) - +new Date(a.creata_il));

  const csv = toCsv(rows, [
    { key: "tipo", header: "tipo" },
    { key: "id", header: "id" },
    { key: "creata_il", header: "creata_il" },
    { key: "utente_email", header: "utente_email" },
    { key: "oggetto", header: "oggetto" },
    { key: "quando", header: "quando" },
    { key: "num", header: "num" },
    { key: "totale_eur", header: "totale_eur" },
    { key: "stato", header: "stato" },
  ]);

  return csvResponse(`prenotazioni_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
