import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// Risposta normalizzata: lista delle "destinazioni" più richieste per il
// modulo selezionato. Per eventi/bnb/ristoranti è una città; per tour è
// il singolo tour (label = titolo, sublabel = attrazione).
type PopularItem = {
  value: string; // valore inserito nel campo input quando l'utente seleziona
  label: string; // riga principale (es. "Roma")
  sublabel?: string; // riga secondaria (es. "Italia", "12 prenotazioni")
  count?: number;
};

const LIMIT = 5;

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") ?? "eventi";
  const admin = createAdminClient();

  let items: PopularItem[] = [];

  if (type === "eventi") {
    // Tutte le coppie biglietti → evento, leggiamo eventi.luogo/citta e
    // contiamo lato JS (Supabase JS non supporta GROUP BY direttamente).
    const { data: eventi } = await admin
      .from("eventi")
      .select("id, luogo, citta")
      .eq("stato", "pubblicato");
    const eventoById = new Map<string, { luogo: string; citta: string | null }>();
    for (const e of (eventi ?? []) as {
      id: string;
      luogo: string;
      citta: string | null;
    }[]) {
      eventoById.set(e.id, { luogo: e.luogo, citta: e.citta });
    }
    const { data: biglietti } = await admin
      .from("biglietti")
      .select("evento_id")
      .neq("stato", "annullato");
    const counts = new Map<string, { count: number; citta: string | null }>();
    for (const b of (biglietti ?? []) as { evento_id: string }[]) {
      const ev = eventoById.get(b.evento_id);
      if (!ev) continue;
      const key = ev.citta || ev.luogo;
      if (!key) continue;
      const prev = counts.get(key);
      counts.set(key, {
        count: (prev?.count ?? 0) + 1,
        citta: ev.citta,
      });
    }
    // Includi anche le città degli eventi pubblicati senza biglietti
    // (count=0) così la dropdown non resta vuota in dev.
    for (const ev of eventoById.values()) {
      const key = ev.citta || ev.luogo;
      if (!counts.has(key)) counts.set(key, { count: 0, citta: ev.citta });
    }
    items = [...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, LIMIT)
      .map(([city, { count }]) => ({
        value: city,
        label: city,
        sublabel: "Italia",
        count,
      }));
  } else if (type === "bnb") {
    const { data: strutture } = await admin
      .from("strutture")
      .select("id, citta")
      .eq("stato", "pubblicato");
    const strutById = new Map<string, string>();
    for (const s of (strutture ?? []) as { id: string; citta: string }[]) {
      strutById.set(s.id, s.citta);
    }
    const { data: camere } = await admin
      .from("camere")
      .select("id, struttura_id");
    const camToStrut = new Map<string, string>();
    for (const c of (camere ?? []) as {
      id: string;
      struttura_id: string;
    }[]) {
      camToStrut.set(c.id, c.struttura_id);
    }
    const { data: prenotazioni } = await admin
      .from("prenotazioni_bnb")
      .select("camera_id")
      .neq("stato", "cancellata");
    const counts = new Map<string, number>();
    for (const p of (prenotazioni ?? []) as { camera_id: string }[]) {
      const strutId = camToStrut.get(p.camera_id);
      if (!strutId) continue;
      const citta = strutById.get(strutId);
      if (!citta) continue;
      counts.set(citta, (counts.get(citta) ?? 0) + 1);
    }
    for (const citta of strutById.values()) {
      if (!counts.has(citta)) counts.set(citta, 0);
    }
    items = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, LIMIT)
      .map(([city, count]) => ({
        value: city,
        label: city,
        sublabel: "Italia",
        count,
      }));
  } else if (type === "ristoranti") {
    const { data: ristoranti } = await admin
      .from("ristoranti")
      .select("id, citta")
      .eq("stato", "pubblicato");
    const ristById = new Map<string, string>();
    for (const r of (ristoranti ?? []) as { id: string; citta: string }[]) {
      ristById.set(r.id, r.citta);
    }
    const { data: tavoli } = await admin
      .from("tavoli")
      .select("id, ristorante_id");
    const tavToRist = new Map<string, string>();
    for (const t of (tavoli ?? []) as {
      id: string;
      ristorante_id: string;
    }[]) {
      tavToRist.set(t.id, t.ristorante_id);
    }
    const { data: prenotazioni } = await admin
      .from("prenotazioni_tavolo")
      .select("tavolo_id")
      .neq("stato", "cancellata");
    const counts = new Map<string, number>();
    for (const p of (prenotazioni ?? []) as { tavolo_id: string }[]) {
      const ristId = tavToRist.get(p.tavolo_id);
      if (!ristId) continue;
      const citta = ristById.get(ristId);
      if (!citta) continue;
      counts.set(citta, (counts.get(citta) ?? 0) + 1);
    }
    for (const citta of ristById.values()) {
      if (!counts.has(citta)) counts.set(citta, 0);
    }
    items = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, LIMIT)
      .map(([city, count]) => ({
        value: city,
        label: city,
        sublabel: "Italia",
        count,
      }));
  } else if (type === "tour") {
    // Per i tour non c'è un contatore di visite: ordiniamo per più recenti.
    const { data: tour } = await admin
      .from("tour_virtuali")
      .select("titolo, attrazioni:attrazione_id(nome, citta)")
      .eq("stato", "pubblicato")
      .order("created_at", { ascending: false })
      .limit(LIMIT);
    const rows = ((tour ?? []) as unknown) as Array<{
      titolo: string;
      attrazioni: { nome: string; citta: string | null } | null;
    }>;
    items = rows.map((t) => ({
      value: t.titolo,
      label: t.titolo,
      sublabel: t.attrazioni
        ? `${t.attrazioni.nome}${t.attrazioni.citta ? ` · ${t.attrazioni.citta}` : ""}`
        : undefined,
    }));
  }

  return NextResponse.json({ items }, {
    headers: { "cache-control": "public, max-age=60, stale-while-revalidate=600" },
  });
}
