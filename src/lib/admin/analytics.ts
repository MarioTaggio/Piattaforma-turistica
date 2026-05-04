import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type RevenueByModule = {
  modulo: string;
  revenueCents: number;
};

export type MonthlyPoint = {
  month: string; // "YYYY-MM"
  count: number;
};

export type TopGestore = {
  gestoreId: string;
  nome: string;
  revenueCents: number;
};

export type TopContenuto = {
  id: string;
  titolo: string;
  modulo: string;
  count: number;
};

export type AnalyticsData = {
  revenue: RevenueByModule[];
  totalRevenueCents: number;
  registrationsByMonth: MonthlyPoint[];
  bookingsByMonth: MonthlyPoint[];
  topGestori: TopGestore[];
  topContenuti: TopContenuto[];
};

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function last12Months(): string[] {
  const out: string[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
    );
  }
  return out;
}

function fillSeries(
  raw: Array<{ created_at: string }>,
): MonthlyPoint[] {
  const counts = new Map<string, number>();
  for (const r of raw) {
    const k = monthKey(r.created_at);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return last12Months().map((m) => ({ month: m, count: counts.get(m) ?? 0 }));
}

export async function getAnalyticsData(): Promise<AnalyticsData> {
  const admin = createAdminClient();
  const since = new Date();
  since.setMonth(since.getMonth() - 12);
  const sinceIso = since.toISOString();

  // ──────────────────────────────────────────────────────────────────
  // Revenue per modulo (somme JS su select grezza)
  // ──────────────────────────────────────────────────────────────────
  const [biglietti, bnb, ordini, video, visite] = await Promise.all([
    admin
      .from("biglietti")
      .select("prezzo_pagato_cents")
      .in("stato", ["valido", "utilizzato"]),
    admin
      .from("prenotazioni_bnb")
      .select("prezzo_totale_cents")
      .eq("stato_pagamento", "pagato"),
    admin
      .from("ordini_shop")
      .select("totale_cents")
      .eq("stato_pagamento", "pagato"),
    admin.from("acquisti_video").select("prezzo_pagato_cents"),
    admin
      .from("prenotazioni_visita")
      .select("prezzo_totale_cents")
      .eq("stato_pagamento", "pagato"),
  ]);

  const sumCol = (rows: unknown, key: string): number =>
    ((rows ?? []) as Record<string, number>[]).reduce(
      (s, r) => s + (Number(r[key]) || 0),
      0,
    );

  const revenue: RevenueByModule[] = [
    {
      modulo: "Eventi",
      revenueCents: sumCol(biglietti.data, "prezzo_pagato_cents"),
    },
    {
      modulo: "B&B",
      revenueCents: sumCol(bnb.data, "prezzo_totale_cents"),
    },
    {
      modulo: "Ristoranti",
      revenueCents: 0, // prenotazioni_tavolo non hanno pagamento nel modello
    },
    {
      modulo: "Shop",
      revenueCents: sumCol(ordini.data, "totale_cents"),
    },
    {
      modulo: "Video",
      revenueCents: sumCol(video.data, "prezzo_pagato_cents"),
    },
    {
      modulo: "Infopoint",
      revenueCents: sumCol(visite.data, "prezzo_totale_cents"),
    },
  ];
  const totalRevenueCents = revenue.reduce((s, r) => s + r.revenueCents, 0);

  // ──────────────────────────────────────────────────────────────────
  // Serie temporali ultimi 12 mesi
  // ──────────────────────────────────────────────────────────────────
  const [usersRows, bnbRows, tavoloRows, visitaRows, bigliettiRows] =
    await Promise.all([
      admin.from("users").select("created_at").gte("created_at", sinceIso),
      admin
        .from("prenotazioni_bnb")
        .select("created_at")
        .gte("created_at", sinceIso),
      admin
        .from("prenotazioni_tavolo")
        .select("created_at")
        .gte("created_at", sinceIso),
      admin
        .from("prenotazioni_visita")
        .select("created_at")
        .gte("created_at", sinceIso),
      admin
        .from("biglietti")
        .select("created_at")
        .gte("created_at", sinceIso),
    ]);

  const registrationsByMonth = fillSeries(
    (usersRows.data ?? []) as { created_at: string }[],
  );

  const bookingsByMonth = fillSeries([
    ...((bnbRows.data ?? []) as { created_at: string }[]),
    ...((tavoloRows.data ?? []) as { created_at: string }[]),
    ...((visitaRows.data ?? []) as { created_at: string }[]),
    ...((bigliettiRows.data ?? []) as { created_at: string }[]),
  ]);

  // ──────────────────────────────────────────────────────────────────
  // Top 5 gestori per revenue (cross-modulo)
  // ──────────────────────────────────────────────────────────────────
  const revenueByGestore = new Map<string, number>();

  // Eventi → biglietti → eventi.gestore_id
  const { data: bigGest } = await admin
    .from("biglietti")
    .select("prezzo_pagato_cents, eventi:evento_id ( gestore_id )")
    .in("stato", ["valido", "utilizzato"]);
  type BR = {
    prezzo_pagato_cents: number;
    eventi: { gestore_id: string } | null;
  };
  for (const r of (bigGest ?? []) as unknown as BR[]) {
    const g = r.eventi?.gestore_id;
    if (g)
      revenueByGestore.set(
        g,
        (revenueByGestore.get(g) ?? 0) + r.prezzo_pagato_cents,
      );
  }

  // B&B → prenotazioni_bnb → camere → strutture.gestore_id
  const { data: bnbGest } = await admin
    .from("prenotazioni_bnb")
    .select(
      "prezzo_totale_cents, camere:camera_id ( strutture:struttura_id ( gestore_id ) )",
    )
    .eq("stato_pagamento", "pagato");
  type BG = {
    prezzo_totale_cents: number;
    camere: { strutture: { gestore_id: string } | null } | null;
  };
  for (const r of (bnbGest ?? []) as unknown as BG[]) {
    const g = r.camere?.strutture?.gestore_id;
    if (g)
      revenueByGestore.set(
        g,
        (revenueByGestore.get(g) ?? 0) + r.prezzo_totale_cents,
      );
  }

  // Shop → ordini_shop → shops.gestore_id
  const { data: shopGest } = await admin
    .from("ordini_shop")
    .select("totale_cents, shops:shop_id ( gestore_id )")
    .eq("stato_pagamento", "pagato");
  type SG = {
    totale_cents: number;
    shops: { gestore_id: string } | null;
  };
  for (const r of (shopGest ?? []) as unknown as SG[]) {
    const g = r.shops?.gestore_id;
    if (g)
      revenueByGestore.set(
        g,
        (revenueByGestore.get(g) ?? 0) + r.totale_cents,
      );
  }

  // Video → acquisti_video → corsi.gestore_id
  const { data: vidGest } = await admin
    .from("acquisti_video")
    .select("prezzo_pagato_cents, corsi:corso_id ( gestore_id )");
  type VG = {
    prezzo_pagato_cents: number;
    corsi: { gestore_id: string } | null;
  };
  for (const r of (vidGest ?? []) as unknown as VG[]) {
    const g = r.corsi?.gestore_id;
    if (g)
      revenueByGestore.set(
        g,
        (revenueByGestore.get(g) ?? 0) + r.prezzo_pagato_cents,
      );
  }

  // Visite → prenotazioni_visita → visite_guidate → attrazioni.gestore_id
  const { data: visGest } = await admin
    .from("prenotazioni_visita")
    .select(
      "prezzo_totale_cents, visite_guidate:visita_id ( attrazioni:attrazione_id ( gestore_id ) )",
    )
    .eq("stato_pagamento", "pagato");
  type ViG = {
    prezzo_totale_cents: number;
    visite_guidate: {
      attrazioni: { gestore_id: string } | null;
    } | null;
  };
  for (const r of (visGest ?? []) as unknown as ViG[]) {
    const g = r.visite_guidate?.attrazioni?.gestore_id;
    if (g)
      revenueByGestore.set(
        g,
        (revenueByGestore.get(g) ?? 0) + r.prezzo_totale_cents,
      );
  }

  // Top 5 + nomi
  const top5Ids = [...revenueByGestore.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const namesById = new Map<string, string>();
  if (top5Ids.length > 0) {
    const { data: u } = await admin
      .from("users")
      .select("id, nome, cognome, email")
      .in(
        "id",
        top5Ids.map((x) => x[0]),
      );
    type U = {
      id: string;
      nome: string | null;
      cognome: string | null;
      email: string;
    };
    for (const row of (u ?? []) as U[]) {
      const display =
        [row.nome, row.cognome].filter(Boolean).join(" ").trim() || row.email;
      namesById.set(row.id, display);
    }
  }
  const topGestori: TopGestore[] = top5Ids.map(([id, rev]) => ({
    gestoreId: id,
    nome: namesById.get(id) ?? id.slice(0, 8),
    revenueCents: rev,
  }));

  // ──────────────────────────────────────────────────────────────────
  // Top 5 contenuti più venduti (cross-modulo: per # vendite)
  // ──────────────────────────────────────────────────────────────────
  const contentCounts = new Map<string, TopContenuto>();

  // Eventi: # biglietti per evento
  const { data: bigCount } = await admin
    .from("biglietti")
    .select("evento_id, eventi:evento_id ( titolo )")
    .in("stato", ["valido", "utilizzato"]);
  type BC = { evento_id: string; eventi: { titolo: string } | null };
  for (const r of (bigCount ?? []) as unknown as BC[]) {
    const k = `eventi:${r.evento_id}`;
    const cur = contentCounts.get(k);
    if (cur) cur.count += 1;
    else
      contentCounts.set(k, {
        id: r.evento_id,
        titolo: r.eventi?.titolo ?? "Evento",
        modulo: "Eventi",
        count: 1,
      });
  }

  // Corsi: # acquisti
  const { data: vidCount } = await admin
    .from("acquisti_video")
    .select("corso_id, corsi:corso_id ( titolo )");
  type VC = { corso_id: string; corsi: { titolo: string } | null };
  for (const r of (vidCount ?? []) as unknown as VC[]) {
    const k = `corsi:${r.corso_id}`;
    const cur = contentCounts.get(k);
    if (cur) cur.count += 1;
    else
      contentCounts.set(k, {
        id: r.corso_id,
        titolo: r.corsi?.titolo ?? "Corso",
        modulo: "Video",
        count: 1,
      });
  }

  const topContenuti = [...contentCounts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    revenue,
    totalRevenueCents,
    registrationsByMonth,
    bookingsByMonth,
    topGestori,
    topContenuti,
  };
}
