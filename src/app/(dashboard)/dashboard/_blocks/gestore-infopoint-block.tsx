import {
  Landmark,
  Users,
  ClipboardCheck,
  Wallet,
  CalendarDays,
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

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

function inDaysIso(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export async function GestoreInfopointBlock({ userId }: { userId: string }) {
  const supabase = createAdminClient();
  const monthStart = startOfMonthIso();
  const now = nowIso();
  const in7 = inDaysIso(7);

  const { data: visiteRows } = await supabase
    .from("visite_guidate")
    .select("id, titolo, data_ora, posti_totali, posti_disponibili, prezzo_cents")
    .eq("gestore_id", userId);

  type VisitaRow = {
    id: string;
    titolo: string;
    data_ora: string;
    posti_totali: number;
    posti_disponibili: number;
    prezzo_cents: number;
  };
  const visite = (visiteRows ?? []) as VisitaRow[];
  const visitaById = new Map(visite.map((v) => [v.id, v]));
  const visiteIds = visite.map((v) => v.id);

  if (visiteIds.length === 0) {
    return (
      <BlockShell accent={ACCENT}>
        <BlockHeader
          emoji="🗺️"
          title="Gestione Infopoint"
          accent={ACCENT}
          href="/dashboard/infopoint"
        />
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Non hai ancora pubblicato visite guidate. Vai alla{" "}
          <a className="underline" href="/dashboard/infopoint">
            gestione infopoint
          </a>
          .
        </p>
      </BlockShell>
    );
  }

  const [
    { count: prenotazioniMese },
    { count: inAttesa },
    visitatoriRes,
    revenueRes,
    prossime7ggRes,
  ] = await Promise.all([
    supabase
      .from("prenotazioni_visita")
      .select("*", { count: "exact", head: true })
      .in("visita_id", visiteIds)
      .gte("created_at", monthStart),
    supabase
      .from("prenotazioni_visita")
      .select("*", { count: "exact", head: true })
      .in("visita_id", visiteIds)
      .eq("stato", "in_attesa"),
    supabase
      .from("prenotazioni_visita")
      .select("num_partecipanti")
      .in("visita_id", visiteIds)
      .neq("stato", "cancellata"),
    supabase
      .from("prenotazioni_visita")
      .select("prezzo_totale_cents")
      .in("visita_id", visiteIds)
      .gte("created_at", monthStart)
      .neq("stato", "cancellata"),
    visite
      .filter(
        (v) =>
          new Date(v.data_ora).getTime() > Date.now() &&
          new Date(v.data_ora).getTime() < Date.now() + 7 * 24 * 60 * 60 * 1000,
      )
      .sort((a, b) => (a.data_ora < b.data_ora ? -1 : 1))
      .slice(0, 5),
  ]);

  const visitatoriTotali = (
    (visitatoriRes.data ?? []) as { num_partecipanti: number }[]
  ).reduce((s, r) => s + (r.num_partecipanti ?? 0), 0);
  const revenueMese = (
    (revenueRes.data ?? []) as { prezzo_totale_cents: number }[]
  ).reduce((s, r) => s + (r.prezzo_totale_cents ?? 0), 0);

  const prossime = prossime7ggRes as VisitaRow[];
  void visitaById;
  void now;
  void in7;

  return (
    <BlockShell accent={ACCENT}>
      <BlockHeader
        emoji="🗺️"
        title="Gestione Infopoint"
        accent={ACCENT}
        href="/dashboard/infopoint"
        hrefLabel="Vai alle attrazioni"
      />

      <StatGrid>
        <MiniStat
          label="Visite del mese"
          value={formatNumber(prenotazioniMese ?? 0)}
          icon={Landmark}
          accent={ACCENT}
          hint="Prenotazioni ricevute"
        />
        <MiniStat
          label="In attesa"
          value={formatNumber(inAttesa ?? 0)}
          icon={ClipboardCheck}
          accent={ACCENT}
          hint="Da confermare"
        />
        <MiniStat
          label="Visitatori totali"
          value={formatNumber(visitatoriTotali)}
          icon={Users}
          accent={ACCENT}
        />
        <MiniStat
          label="Revenue del mese"
          value={formatEurFromCents(revenueMese)}
          icon={Wallet}
          accent={ACCENT}
        />
      </StatGrid>

      <CardList
        title="Prossime visite (7 giorni)"
        description="Le visite guidate in arrivo."
        accent={ACCENT}
        href="/dashboard/infopoint"
        isEmpty={prossime.length === 0}
        emptyText="Nessuna visita pianificata nei prossimi 7 giorni."
      >
        {prossime.map((v) => (
          <ListRow
            key={v.id}
            primary={
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5 text-muted-foreground" />
                {v.titolo}
              </span>
            }
            secondary={`${v.posti_disponibili}/${v.posti_totali} posti · ${formatEurFromCents(v.prezzo_cents)}`}
            trailing={formatDateTime(v.data_ora)}
            href={`/dashboard/infopoint/${v.id}`}
          />
        ))}
      </CardList>
    </BlockShell>
  );
}
