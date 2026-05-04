import type { Metadata } from "next";
import {
  Users,
  UserCog,
  CalendarCheck,
  Wallet,
  Ticket,
  ShoppingBag,
  ClipboardList,
  UserPlus,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { SectionCard } from "@/components/admin/section-card";
import { BarChart } from "@/components/admin/bar-chart";
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Panoramica admin — Piattaforma Turistica",
};

const GESTORE_ROLES = [
  "gestore_eventi",
  "gestore_bnb",
  "gestore_ristorante",
  "gestore_video",
  "gestore_infopoint",
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

function daysAgo(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

const dayLabel = new Intl.DateTimeFormat("it-IT", {
  day: "2-digit",
  month: "2-digit",
});

export default async function AdminOverviewPage() {
  const supabase = createAdminClient();
  const today = startOfToday().toISOString();
  const monthStart = startOfMonth().toISOString();
  const thirty = daysAgo(29).toISOString();

  const [
    { count: utentiTotal },
    { data: gestoriRows },
    { count: bnbToday },
    { count: tavoloToday },
    { count: visiteToday },
    { count: bigliettiToday },
    { data: bigliettiMonth },
    { data: ordiniMonth },
    { data: bnb30 },
    { data: tavolo30 },
    { data: visite30 },
    { data: biglietti30 },
    { data: lastBiglietti },
    { data: lastOrdini },
    { data: lastBnb },
    { data: lastVisite },
    { data: lastUsers },
  ] = await Promise.all([
    supabase.from("users").select("*", { count: "exact", head: true }),
    supabase.from("user_roles").select("user_id").in("role", GESTORE_ROLES),
    supabase
      .from("prenotazioni_bnb")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("prenotazioni_tavolo")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("prenotazioni_visita")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("biglietti")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today),
    supabase
      .from("biglietti")
      .select("prezzo_pagato_cents, created_at")
      .gte("created_at", monthStart),
    supabase
      .from("ordini")
      .select("totale_cents, created_at, stato_pagamento")
      .gte("created_at", monthStart),
    supabase
      .from("prenotazioni_bnb")
      .select("created_at")
      .gte("created_at", thirty),
    supabase
      .from("prenotazioni_tavolo")
      .select("created_at")
      .gte("created_at", thirty),
    supabase
      .from("prenotazioni_visita")
      .select("created_at")
      .gte("created_at", thirty),
    supabase.from("biglietti").select("created_at").gte("created_at", thirty),
    supabase
      .from("biglietti")
      .select(
        "id, created_at, prezzo_pagato_cents, eventi(titolo), users(nome, cognome, email)",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("ordini")
      .select(
        "id, created_at, totale_cents, ristoranti(nome), users(nome, cognome, email)",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("prenotazioni_bnb")
      .select(
        "id, created_at, prezzo_totale_cents, camere(nome, strutture(nome)), users(nome, cognome, email)",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("prenotazioni_visita")
      .select(
        "id, created_at, prezzo_totale_cents, visite_guidate(titolo), users(nome, cognome, email)",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("users")
      .select("id, email, nome, cognome, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const distinctGestori = new Set(
    ((gestoriRows ?? []) as { user_id: string }[]).map((r) => r.user_id),
  ).size;

  const prenotazioniOggi =
    (bigliettiToday ?? 0) +
    (bnbToday ?? 0) +
    (visiteToday ?? 0) +
    (tavoloToday ?? 0);

  const revenueMese =
    ((bigliettiMonth ?? []) as { prezzo_pagato_cents: number }[]).reduce(
      (s, r) => s + (r.prezzo_pagato_cents ?? 0),
      0,
    ) +
    ((ordiniMonth ?? []) as {
      totale_cents: number;
      stato_pagamento: string;
    }[])
      .filter((r) => r.stato_pagamento === "pagato")
      .reduce((s, r) => s + (r.totale_cents ?? 0), 0);

  // Build 30-day chart aggregating all bookings.
  const buckets = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = daysAgo(i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const arr of [bnb30, tavolo30, visite30, biglietti30] as Array<
    { created_at: string }[] | null
  >) {
    for (const row of arr ?? []) {
      const k = dayKey(row.created_at);
      if (buckets.has(k)) buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
  }
  const chartData = Array.from(buckets.entries()).map(([k, v]) => ({
    label: dayLabel.format(new Date(k)),
    value: v,
    hint: `${v} prenotazioni`,
  }));

  type Activity = {
    id: string;
    icon: typeof Ticket;
    iconClass: string;
    when: string;
    title: string;
    sub: string;
    amount?: number;
    sortKey: number;
  };

  function userLabel(u: {
    nome: string | null;
    cognome: string | null;
    email: string;
  } | null) {
    if (!u) return "Utente sconosciuto";
    const full = [u.nome, u.cognome].filter(Boolean).join(" ").trim();
    return full || u.email;
  }

  const activities: Activity[] = [];

  for (const r of (lastBiglietti ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    prezzo_pagato_cents: number;
    eventi: { titolo: string } | null;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  }>) {
    activities.push({
      id: `biglietto-${r.id}`,
      icon: Ticket,
      iconClass: "bg-sky-50 text-sky-700",
      when: r.created_at,
      title: `${userLabel(r.users)} ha acquistato un biglietto`,
      sub: r.eventi?.titolo ?? "Evento",
      amount: r.prezzo_pagato_cents,
      sortKey: new Date(r.created_at).getTime(),
    });
  }

  for (const r of (lastOrdini ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    totale_cents: number;
    ristoranti: { nome: string } | null;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  }>) {
    activities.push({
      id: `ordine-${r.id}`,
      icon: ShoppingBag,
      iconClass: "bg-amber-50 text-amber-700",
      when: r.created_at,
      title: `Nuovo ordine da ${userLabel(r.users)}`,
      sub: r.ristoranti?.nome ?? "Ristorante",
      amount: r.totale_cents,
      sortKey: new Date(r.created_at).getTime(),
    });
  }

  for (const r of (lastBnb ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    prezzo_totale_cents: number;
    camere: { nome: string; strutture: { nome: string } | null } | null;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  }>) {
    activities.push({
      id: `bnb-${r.id}`,
      icon: ClipboardList,
      iconClass: "bg-emerald-50 text-emerald-700",
      when: r.created_at,
      title: `Prenotazione B&B da ${userLabel(r.users)}`,
      sub: r.camere?.strutture?.nome ?? r.camere?.nome ?? "Struttura",
      amount: r.prezzo_totale_cents,
      sortKey: new Date(r.created_at).getTime(),
    });
  }

  for (const r of (lastVisite ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    prezzo_totale_cents: number;
    visite_guidate: { titolo: string } | null;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  }>) {
    activities.push({
      id: `visita-${r.id}`,
      icon: ClipboardList,
      iconClass: "bg-violet-50 text-violet-700",
      when: r.created_at,
      title: `Prenotazione visita da ${userLabel(r.users)}`,
      sub: r.visite_guidate?.titolo ?? "Visita guidata",
      amount: r.prezzo_totale_cents,
      sortKey: new Date(r.created_at).getTime(),
    });
  }

  for (const r of (lastUsers ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    nome: string | null;
    cognome: string | null;
    email: string;
  }>) {
    activities.push({
      id: `user-${r.id}`,
      icon: UserPlus,
      iconClass: "bg-brand-50 text-brand-700",
      when: r.created_at,
      title: "Nuovo utente registrato",
      sub: userLabel(r),
      sortKey: new Date(r.created_at).getTime(),
    });
  }

  activities.sort((a, b) => b.sortKey - a.sortKey);
  const top10 = activities.slice(0, 10);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panoramica piattaforma"
        subtitle="KPI principali, prenotazioni recenti e attività della community."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          variant="primary"
          label="Revenue mese"
          value={formatEurFromCents(revenueMese)}
          icon={Wallet}
          hint="Biglietti + ordini pagati"
        />
        <StatCard
          label="Utenti totali"
          value={formatNumber(utentiTotal ?? 0)}
          icon={Users}
        />
        <StatCard
          label="Gestori attivi"
          value={formatNumber(distinctGestori)}
          icon={UserCog}
          hint={`Su ${GESTORE_ROLES.length} categorie`}
        />
        <StatCard
          label="Prenotazioni oggi"
          value={formatNumber(prenotazioniOggi)}
          icon={CalendarCheck}
          hint="Biglietti, B&B, visite, tavoli"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Andamento prenotazioni"
          subtitle="Ultimi 30 giorni · tutte le tipologie"
        >
          <BarChart data={chartData} height={220} />
        </SectionCard>

        <SectionCard
          title="Attività recenti"
          subtitle="Ultime 10 azioni sulla piattaforma"
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {top10.length === 0 && (
              <li className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nessuna attività recente
              </li>
            )}
            {top10.map((a) => {
              const Icon = a.icon;
              return (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-lg ${a.iconClass}`}
                  >
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.sub}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {formatDateTime(a.when)}
                    </p>
                  </div>
                  {a.amount !== undefined && a.amount > 0 && (
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      {formatEurFromCents(a.amount)}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
