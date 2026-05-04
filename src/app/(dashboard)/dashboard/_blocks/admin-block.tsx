import {
  Wallet,
  Users,
  CalendarCheck,
  ShoppingBag,
  AlertTriangle,
  Trophy,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";

import {
  BlockHeader,
  BlockShell,
  CardList,
  ListRow,
  MiniStat,
  StatGrid,
} from "./_section";
import {
  DailyRevenueChart,
  RevenuePerModuloChart,
  type DailyRevenuePoint,
  type ModuloRevenuePoint,
} from "./_admin-charts";

const ACCENT = "purple" as const;

function startOfMonthIso(d = new Date()): string {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function startOfPrevMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() - 1, 1).toISOString();
}

function endOfPrevMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function nDaysAgoIso(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString();
}

function ymKey(d: Date): string {
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${m}/${d.getFullYear().toString().slice(2)}`;
}

function ymdKey(d: Date): string {
  const day = d.getDate().toString().padStart(2, "0");
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${m}`;
}

export async function AdminBlock() {
  const supabase = createAdminClient();
  const monthStart = startOfMonthIso();
  const prevMonthStart = startOfPrevMonthIso();
  const prevMonthEnd = endOfPrevMonthIso();
  const sixMonthsAgo = (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() - 5, 1).toISOString();
  })();
  const thirtyDaysAgo = nDaysAgoIso(30);

  const [
    biglietti,
    bnb,
    visita,
    ristorante,
    shop,
    video,
    { count: utentiNuovi },
    { count: prenotazioniMese },
    { count: ordiniInAttesa },
    bigliettiScaduteRes,
    bnbScaduteRes,
    visiteScaduteRes,
    topGestoriRes,
    realtimeAttRes,
  ] = await Promise.all([
    supabase
      .from("biglietti")
      .select("prezzo_pagato_cents, created_at, evento_id")
      .gte("created_at", sixMonthsAgo),
    supabase
      .from("prenotazioni_bnb")
      .select("prezzo_totale_cents, created_at, stato, data_check_in")
      .gte("created_at", sixMonthsAgo),
    supabase
      .from("prenotazioni_visita")
      .select("prezzo_totale_cents, created_at, stato")
      .gte("created_at", sixMonthsAgo),
    supabase
      .from("ordini")
      .select("totale_cents, created_at, stato, ristorante_id")
      .gte("created_at", sixMonthsAgo),
    supabase
      .from("ordini_shop")
      .select("totale_cents, created_at, stato, shop_id")
      .gte("created_at", sixMonthsAgo),
    supabase
      .from("acquisti_video")
      .select("prezzo_pagato_cents, created_at, corso_id")
      .gte("created_at", sixMonthsAgo),
    supabase
      .from("users")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("prenotazioni_bnb")
      .select("*", { count: "exact", head: true })
      .gte("created_at", monthStart),
    supabase
      .from("ordini")
      .select("*", { count: "exact", head: true })
      .eq("stato", "in_attesa"),
    supabase
      .from("biglietti")
      .select("id, eventi!inner(titolo, data_fine)")
      .eq("stato", "valido")
      .lt("eventi.data_fine", new Date().toISOString())
      .limit(5),
    supabase
      .from("prenotazioni_bnb")
      .select("id, data_check_in, stato")
      .eq("stato", "in_attesa")
      .lt("data_check_in", new Date().toISOString().slice(0, 10))
      .limit(5),
    supabase
      .from("prenotazioni_visita")
      .select("id, stato, visite_guidate!inner(titolo, data_ora)")
      .eq("stato", "in_attesa")
      .lt("visite_guidate.data_ora", new Date().toISOString())
      .limit(5),
    supabase
      .from("user_roles")
      .select("user_id, role, users(nome, cognome, email)")
      .in("role", [
        "gestore_eventi",
        "gestore_bnb",
        "gestore_ristorante",
        "gestore_shop",
        "gestore_video",
        "gestore_infopoint",
      ]),
    supabase
      .from("biglietti")
      .select("id, created_at, prezzo_pagato_cents")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  // ────────────────────────────────────────────────────────────────────────
  // Revenue totale 6 mesi (somma piatta) + delta mese su mese
  // ────────────────────────────────────────────────────────────────────────
  type Row = { cents: number; created_at: string };
  const fold = (
    rows: { created_at: string }[],
    centsKey: string,
  ): Row[] =>
    (rows as Record<string, unknown>[]).map((r) => ({
      cents: Number(r[centsKey] ?? 0),
      created_at: r.created_at as string,
    }));

  const allCents: { cents: number; created_at: string; modulo: string }[] = [
    ...fold((biglietti.data ?? []) as { created_at: string }[], "prezzo_pagato_cents").map(
      (r) => ({ ...r, modulo: "eventi" }),
    ),
    ...fold((bnb.data ?? []) as { created_at: string }[], "prezzo_totale_cents").map(
      (r) => ({ ...r, modulo: "bnb" }),
    ),
    ...fold(
      (visita.data ?? []) as { created_at: string }[],
      "prezzo_totale_cents",
    ).map((r) => ({ ...r, modulo: "visite" })),
    ...fold((ristorante.data ?? []) as { created_at: string }[], "totale_cents").map(
      (r) => ({ ...r, modulo: "ristoranti" }),
    ),
    ...fold((shop.data ?? []) as { created_at: string }[], "totale_cents").map(
      (r) => ({ ...r, modulo: "shop" }),
    ),
    ...fold(
      (video.data ?? []) as { created_at: string }[],
      "prezzo_pagato_cents",
    ).map((r) => ({ ...r, modulo: "video" })),
  ];

  const revenueTot = allCents.reduce((s, r) => s + r.cents, 0);
  const revenueMese = allCents
    .filter((r) => r.created_at >= monthStart)
    .reduce((s, r) => s + r.cents, 0);
  const revenueMesePrev = allCents
    .filter((r) => r.created_at >= prevMonthStart && r.created_at < prevMonthEnd)
    .reduce((s, r) => s + r.cents, 0);

  const deltaPct =
    revenueMesePrev === 0
      ? null
      : Math.round(((revenueMese - revenueMesePrev) / revenueMesePrev) * 100);

  // ────────────────────────────────────────────────────────────────────────
  // Stacked BarChart per modulo, ultimi 6 mesi
  // ────────────────────────────────────────────────────────────────────────
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i, 1);
    months.push(ymKey(d));
  }
  const monthsSet = new Map<string, ModuloRevenuePoint>();
  for (const m of months) {
    monthsSet.set(m, {
      month: m,
      eventi: 0,
      bnb: 0,
      ristoranti: 0,
      shop: 0,
      video: 0,
      visite: 0,
    });
  }
  for (const r of allCents) {
    const d = new Date(r.created_at);
    const key = ymKey(d);
    const point = monthsSet.get(key);
    if (point) {
      const k = r.modulo as keyof ModuloRevenuePoint;
      const cur = point[k];
      if (typeof cur === "number") {
        (point[k] as number) = cur + r.cents / 100;
      }
    }
  }
  const moduliChartData = Array.from(monthsSet.values());

  // ────────────────────────────────────────────────────────────────────────
  // LineChart revenue 30 giorni
  // ────────────────────────────────────────────────────────────────────────
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    days.push(ymdKey(new Date(Date.now() - i * 24 * 60 * 60 * 1000)));
  }
  const dailyMap = new Map<string, number>(days.map((d) => [d, 0]));
  for (const r of allCents) {
    if (r.created_at < thirtyDaysAgo) continue;
    const key = ymdKey(new Date(r.created_at));
    if (dailyMap.has(key)) {
      dailyMap.set(key, (dailyMap.get(key) ?? 0) + r.cents / 100);
    }
  }
  const dailyData: DailyRevenuePoint[] = Array.from(dailyMap.entries()).map(
    ([day, revenue]) => ({ day, revenue }),
  );

  // ────────────────────────────────────────────────────────────────────────
  // Top 5 gestori per revenue (mese in corso, somma su tutti i moduli)
  // ────────────────────────────────────────────────────────────────────────
  type RoleRow = {
    user_id: string;
    role: string;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  };
  const gestori = (topGestoriRes.data ?? []) as unknown as RoleRow[];
  const gestoriByUser = new Map<
    string,
    {
      user_id: string;
      label: string;
      ruoli: string[];
    }
  >();
  for (const g of gestori) {
    if (!g.users) continue;
    const label =
      [g.users.nome, g.users.cognome].filter(Boolean).join(" ") ||
      g.users.email;
    const cur = gestoriByUser.get(g.user_id) ?? {
      user_id: g.user_id,
      label,
      ruoli: [],
    };
    cur.ruoli.push(g.role.replace("gestore_", ""));
    gestoriByUser.set(g.user_id, cur);
  }

  // Per associare revenue ai gestori serve un secondo passaggio:
  // contiamo le righe collegate via le tabelle entità (eventi, strutture/camere,
  // ristoranti, shops, corsi, visite_guidate). Più semplice: usiamo ranking
  // semplificato: per ogni gestore, sommiamo i loro contenuti.
  const [
    eventiByGestore,
    struttureByGestore,
    ristorantiByGestore,
    shopByGestore,
    corsiByGestore,
    visiteByGestore,
  ] = await Promise.all([
    supabase.from("eventi").select("id, gestore_id"),
    supabase.from("strutture").select("id, gestore_id"),
    supabase.from("ristoranti").select("id, gestore_id"),
    supabase.from("shops").select("id, gestore_id"),
    supabase.from("corsi").select("id, gestore_id"),
    supabase.from("visite_guidate").select("id, gestore_id"),
  ]);

  const revenueByGestore = new Map<string, number>();
  const addRevenue = (
    rows: { id: string; gestore_id: string }[] | null,
    revRows: { cents: number; key: string }[],
    keyName: string,
  ) => {
    const ownerByEntity = new Map(
      (rows ?? []).map((r) => [r.id, r.gestore_id]),
    );
    void keyName;
    for (const r of revRows) {
      const owner = ownerByEntity.get(r.key);
      if (!owner) continue;
      revenueByGestore.set(
        owner,
        (revenueByGestore.get(owner) ?? 0) + r.cents,
      );
    }
  };

  addRevenue(
    eventiByGestore.data as { id: string; gestore_id: string }[] | null,
    ((biglietti.data ?? []) as { evento_id: string; prezzo_pagato_cents: number; created_at: string }[])
      .filter((r) => r.created_at >= monthStart)
      .map((r) => ({ cents: r.prezzo_pagato_cents, key: r.evento_id })),
    "evento_id",
  );
  addRevenue(
    ristorantiByGestore.data as { id: string; gestore_id: string }[] | null,
    ((ristorante.data ?? []) as { ristorante_id: string; totale_cents: number; created_at: string }[])
      .filter((r) => r.created_at >= monthStart)
      .map((r) => ({ cents: r.totale_cents, key: r.ristorante_id })),
    "ristorante_id",
  );
  addRevenue(
    shopByGestore.data as { id: string; gestore_id: string }[] | null,
    ((shop.data ?? []) as { shop_id: string; totale_cents: number; created_at: string }[])
      .filter((r) => r.created_at >= monthStart)
      .map((r) => ({ cents: r.totale_cents, key: r.shop_id })),
    "shop_id",
  );
  // For corsi we need corso_id → gestore lookup but acquisti_video doesn't
  // include corso_id in our select → we DO have it. Use that.
  addRevenue(
    corsiByGestore.data as { id: string; gestore_id: string }[] | null,
    ((video.data ?? []) as { corso_id: string; prezzo_pagato_cents: number; created_at: string }[])
      .filter((r) => r.created_at >= monthStart)
      .map((r) => ({ cents: r.prezzo_pagato_cents, key: r.corso_id })),
    "corso_id",
  );
  // BNB e visite richiederebbero tabelle intermedie. Per il top 5 ignoriamo.
  void struttureByGestore;
  void visiteByGestore;

  const topGestori = Array.from(gestoriByUser.values())
    .map((g) => ({
      ...g,
      revenue: revenueByGestore.get(g.user_id) ?? 0,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ────────────────────────────────────────────────────────────────────────
  // Alert prenotazioni scadute
  // ────────────────────────────────────────────────────────────────────────
  type ScadBig = { id: string; eventi: { titolo: string; data_fine: string } | null };
  type ScadVisita = {
    id: string;
    visite_guidate: { titolo: string; data_ora: string } | null;
  };
  type ScadBnb = { id: string; data_check_in: string; stato: string };

  const scaduteBig = (bigliettiScaduteRes.data ?? []) as unknown as ScadBig[];
  const scaduteVisite = (visiteScaduteRes.data ?? []) as unknown as ScadVisita[];
  const scaduteBnb = (bnbScaduteRes.data ?? []) as unknown as ScadBnb[];

  type RealtimeBig = {
    id: string;
    created_at: string;
    prezzo_pagato_cents: number;
  };
  const realtime = (realtimeAttRes.data ?? []) as unknown as RealtimeBig[];

  return (
    <BlockShell accent={ACCENT}>
      <BlockHeader
        emoji="⚙️"
        title="Amministrazione"
        subtitle="Panoramica completa della piattaforma."
        accent={ACCENT}
        href="/dashboard/admin"
        hrefLabel="Dashboard admin"
      />

      <StatGrid>
        <MiniStat
          label="Revenue totale"
          value={formatEurFromCents(revenueTot)}
          icon={Wallet}
          accent={ACCENT}
          hint={
            deltaPct === null
              ? "Da inizio piattaforma"
              : `${deltaPct >= 0 ? "+" : ""}${deltaPct}% vs mese scorso`
          }
        />
        <MiniStat
          label="Nuovi utenti"
          value={formatNumber(utentiNuovi ?? 0)}
          icon={Users}
          accent={ACCENT}
          hint="Mese corrente"
        />
        <MiniStat
          label="Prenotazioni del mese"
          value={formatNumber(prenotazioniMese ?? 0)}
          icon={CalendarCheck}
          accent={ACCENT}
        />
        <MiniStat
          label="Ordini in attesa"
          value={formatNumber(ordiniInAttesa ?? 0)}
          icon={ShoppingBag}
          accent={ACCENT}
          hint="Da elaborare"
        />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <header className="mb-3">
            <h4 className="text-sm font-semibold text-foreground">
              Revenue per modulo (6 mesi)
            </h4>
            <p className="text-xs text-muted-foreground">
              Vendite cumulate per modulo, in € — ultimi 6 mesi.
            </p>
          </header>
          <RevenuePerModuloChart data={moduliChartData} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <header className="mb-3">
            <h4 className="text-sm font-semibold text-foreground">
              Revenue ultimi 30 giorni
            </h4>
            <p className="text-xs text-muted-foreground">
              Andamento giornaliero, tutti i moduli.
            </p>
          </header>
          <DailyRevenueChart data={dailyData} />
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <CardList
          title="Top 5 gestori (mese)"
          description="Per revenue del mese in corso."
          accent={ACCENT}
          href="/dashboard/admin/gestori"
          isEmpty={topGestori.length === 0}
          emptyText="Nessun gestore registrato."
        >
          {topGestori.map((g, i) => (
            <ListRow
              key={g.user_id}
              primary={
                <span className="flex items-center gap-1.5">
                  <Trophy
                    className={`size-3.5 ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}
                  />
                  {g.label}
                </span>
              }
              secondary={g.ruoli.map((r) => r.replaceAll("_", " ")).join(", ")}
              trailing={formatEurFromCents(g.revenue)}
              href="/dashboard/admin/gestori"
            />
          ))}
        </CardList>

        <CardList
          title="Attività in tempo reale"
          description="Ultime 5 vendite biglietti."
          accent={ACCENT}
          href="/dashboard/admin/biglietti"
          isEmpty={realtime.length === 0}
          emptyText="Ancora nessuna attività."
        >
          {realtime.map((r) => (
            <ListRow
              key={r.id}
              primary="Biglietto venduto"
              secondary={formatDateTime(r.created_at)}
              trailing={formatEurFromCents(r.prezzo_pagato_cents)}
            />
          ))}
        </CardList>
      </div>

      {(scaduteBig.length > 0 ||
        scaduteVisite.length > 0 ||
        scaduteBnb.length > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <header className="mb-3 flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-amber-100 text-amber-800">
              <AlertTriangle className="size-4" />
            </span>
            <div>
              <h4 className="text-sm font-semibold text-amber-900">
                Alert: prenotazioni scadute
              </h4>
              <p className="text-xs text-amber-800/80">
                Elementi rimasti in attesa oltre la data prevista.
              </p>
            </div>
          </header>
          <ul className="space-y-1.5 text-sm">
            {scaduteBig.map((s) => (
              <li
                key={s.id}
                className="rounded-lg bg-white px-3 py-2 text-amber-900"
              >
                Biglietto · evento {s.eventi?.titolo ?? "—"} (terminato{" "}
                {formatDateTime(s.eventi?.data_fine)})
              </li>
            ))}
            {scaduteVisite.map((s) => (
              <li
                key={s.id}
                className="rounded-lg bg-white px-3 py-2 text-amber-900"
              >
                Visita · {s.visite_guidate?.titolo ?? "—"} ·{" "}
                {formatDateTime(s.visite_guidate?.data_ora)}
              </li>
            ))}
            {scaduteBnb.map((s) => (
              <li
                key={s.id}
                className="rounded-lg bg-white px-3 py-2 text-amber-900"
              >
                B&amp;B · check-in previsto {s.data_check_in}, ancora in attesa
              </li>
            ))}
          </ul>
        </div>
      )}
    </BlockShell>
  );
}
