import {
  Ticket,
  CalendarDays,
  Wallet,
  Users,
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

const ACCENT = "green" as const;

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export async function GestoreEventiBlock({ userId }: { userId: string }) {
  const supabase = createAdminClient();
  const todayStart = startOfTodayIso();
  const monthStart = startOfMonthIso();
  const nowIso = new Date().toISOString();

  // First, fetch the gestore's eventi IDs once — we'll filter biglietti by it.
  const { data: eventiRows } = await supabase
    .from("eventi")
    .select("id, titolo, data_inizio, data_fine, stato, posti_totali, posti_disponibili")
    .eq("gestore_id", userId);

  type EventoRow = {
    id: string;
    titolo: string;
    data_inizio: string;
    data_fine: string;
    stato: string;
    posti_totali: number;
    posti_disponibili: number;
  };
  const eventi = (eventiRows ?? []) as EventoRow[];
  const eventiIds = eventi.map((e) => e.id);
  const eventiTitoloById = new Map(eventi.map((e) => [e.id, e.titolo]));

  const eventiAttivi = eventi.filter(
    (e) => e.stato === "pubblicato" && new Date(e.data_fine).getTime() >= Date.now(),
  );
  const postiRimasti = eventiAttivi.reduce(
    (s, e) => s + (e.posti_disponibili ?? 0),
    0,
  );

  // Biglietti dei propri eventi.
  const [
    { count: bigliettiOggi },
    bigliettiMese,
    ultimiBiglietti,
  ] = eventiIds.length === 0
    ? [
        { count: 0 } as { count: number | null },
        { data: [] as { prezzo_pagato_cents: number }[] },
        { data: [] as unknown[] },
      ]
    : await Promise.all([
        supabase
          .from("biglietti")
          .select("*", { count: "exact", head: true })
          .in("evento_id", eventiIds)
          .gte("created_at", todayStart),
        supabase
          .from("biglietti")
          .select("prezzo_pagato_cents")
          .in("evento_id", eventiIds)
          .gte("created_at", monthStart),
        supabase
          .from("biglietti")
          .select("id, evento_id, prezzo_pagato_cents, stato, created_at, users(nome, cognome, email)")
          .in("evento_id", eventiIds)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

  const incassoMese = (
    (bigliettiMese.data ?? []) as { prezzo_pagato_cents: number }[]
  ).reduce((s, r) => s + (r.prezzo_pagato_cents ?? 0), 0);

  type BigRow = {
    id: string;
    evento_id: string;
    prezzo_pagato_cents: number;
    stato: string;
    created_at: string;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  };
  const biglietti = (ultimiBiglietti.data ?? []) as unknown as BigRow[];

  const eventiInArrivo = eventi
    .filter((e) => new Date(e.data_inizio).getTime() > Date.now())
    .sort((a, b) => (a.data_inizio < b.data_inizio ? -1 : 1))
    .slice(0, 5);
  void nowIso;

  return (
    <BlockShell accent={ACCENT}>
      <BlockHeader
        emoji="🎫"
        title="Gestione Eventi"
        accent={ACCENT}
        href="/dashboard/eventi"
        hrefLabel="Vai alla gestione"
      />

      <StatGrid>
        <MiniStat
          label="Biglietti venduti oggi"
          value={formatNumber(bigliettiOggi ?? 0)}
          icon={Ticket}
          accent={ACCENT}
        />
        <MiniStat
          label="Eventi attivi"
          value={formatNumber(eventiAttivi.length)}
          icon={CalendarDays}
          accent={ACCENT}
          hint={`Su ${formatNumber(eventi.length)} totali`}
        />
        <MiniStat
          label="Incasso del mese"
          value={formatEurFromCents(incassoMese)}
          icon={Wallet}
          accent={ACCENT}
        />
        <MiniStat
          label="Posti rimasti"
          value={formatNumber(postiRimasti)}
          icon={Users}
          accent={ACCENT}
          hint="Negli eventi attivi"
        />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <CardList
          title="Prossimi eventi"
          description="In ordine di data, prossimi 5."
          accent={ACCENT}
          href="/dashboard/eventi"
          isEmpty={eventiInArrivo.length === 0}
          emptyText="Nessun evento futuro pianificato."
        >
          {eventiInArrivo.map((e) => (
            <ListRow
              key={e.id}
              primary={e.titolo}
              secondary={`${formatDateTime(e.data_inizio)} · ${e.posti_disponibili}/${e.posti_totali} posti`}
              trailing={e.stato}
              href={`/dashboard/eventi/${e.id}`}
            />
          ))}
        </CardList>

        <CardList
          title="Ultimi biglietti venduti"
          description="Le 5 vendite più recenti."
          accent={ACCENT}
          href="/dashboard/eventi"
          isEmpty={biglietti.length === 0}
          emptyText="Ancora nessuna vendita."
        >
          {biglietti.map((b) => {
            const utente = b.users
              ? [b.users.nome, b.users.cognome].filter(Boolean).join(" ") ||
                b.users.email
              : "—";
            return (
              <ListRow
                key={b.id}
                primary={eventiTitoloById.get(b.evento_id) ?? "Evento"}
                secondary={`${utente} · ${formatDateTime(b.created_at)}`}
                trailing={formatEurFromCents(b.prezzo_pagato_cents)}
              />
            );
          })}
        </CardList>
      </div>
    </BlockShell>
  );
}
