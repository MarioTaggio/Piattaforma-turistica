import {
  Ticket,
  CalendarClock,
  ShoppingBag,
  GraduationCap,
  Hotel,
  UtensilsCrossed,
  PlayCircle,
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

const ACCENT = "blue" as const;

function inDays(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function nowIso(): string {
  return new Date().toISOString();
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function in7DaysDate(): string {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function countdown(targetIso: string): string {
  const ms = new Date(targetIso).getTime() - Date.now();
  if (ms < 0) return "in corso";
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
  if (days >= 1) return `tra ${days}g ${hours}h`;
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  return `tra ${hours}h ${minutes}m`;
}

export async function UtenteBlock({
  userId,
  nome,
}: {
  userId: string;
  nome: string | null;
}) {
  const supabase = createAdminClient();
  const today = todayDate();
  const in7 = in7DaysDate();
  const nowIs = nowIso();
  const in7Iso = inDays(7);

  const [
    { count: bigliettiAttivi },
    { count: prenBnb7gg },
    { count: prenTavolo7gg },
    { count: prenVisita7gg },
    { count: ordiniInCorso },
    { count: ordiniShopInCorso },
    { count: corsiAcquistati },
    prossimiBiglietti,
    prossimiBnb,
    ultimiOrdiniRist,
    ultimiOrdiniShop,
    continuaCorsi,
  ] = await Promise.all([
    supabase
      .from("biglietti")
      .select("*", { count: "exact", head: true })
      .eq("utente_id", userId)
      .eq("stato", "valido"),
    supabase
      .from("prenotazioni_bnb")
      .select("*", { count: "exact", head: true })
      .eq("utente_id", userId)
      .gte("data_check_in", today)
      .lte("data_check_in", in7)
      .in("stato", ["in_attesa", "confermata"]),
    supabase
      .from("prenotazioni_tavolo")
      .select("*", { count: "exact", head: true })
      .eq("utente_id", userId)
      .gte("data_ora", nowIs)
      .lte("data_ora", in7Iso)
      .in("stato", ["in_attesa", "confermata"]),
    supabase
      .from("prenotazioni_visita")
      .select("*", { count: "exact", head: true })
      .eq("utente_id", userId)
      .in("stato", ["in_attesa", "confermata"]),
    supabase
      .from("ordini")
      .select("*", { count: "exact", head: true })
      .eq("utente_id", userId)
      .in("stato", ["in_attesa", "in_preparazione", "pronto"]),
    supabase
      .from("ordini_shop")
      .select("*", { count: "exact", head: true })
      .eq("utente_id", userId)
      .in("stato", ["in_attesa", "in_preparazione", "pronto"]),
    supabase
      .from("acquisti_video")
      .select("*", { count: "exact", head: true })
      .eq("utente_id", userId),
    supabase
      .from("biglietti")
      .select("id, evento_id, eventi(titolo, data_inizio, luogo, citta)")
      .eq("utente_id", userId)
      .eq("stato", "valido")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("prenotazioni_bnb")
      .select(
        "id, data_check_in, data_check_out, num_ospiti, stato, camere(nome, strutture(nome, citta))",
      )
      .eq("utente_id", userId)
      .gte("data_check_in", today)
      .in("stato", ["in_attesa", "confermata"])
      .order("data_check_in", { ascending: true })
      .limit(3),
    supabase
      .from("ordini")
      .select(
        "id, totale_cents, stato, created_at, ristoranti(nome)",
      )
      .eq("utente_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("ordini_shop")
      .select("id, totale_cents, stato, created_at, shops(nome)")
      .eq("utente_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("acquisti_video")
      .select("id, created_at, corso_id, corsi(id, titolo, durata_totale_secondi)")
      .eq("utente_id", userId)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const prenotazioni7gg =
    (prenBnb7gg ?? 0) + (prenTavolo7gg ?? 0) + (prenVisita7gg ?? 0);
  const ordiniTot = (ordiniInCorso ?? 0) + (ordiniShopInCorso ?? 0);

  type EventoBiglietto = {
    id: string;
    eventi: {
      titolo: string;
      data_inizio: string;
      luogo: string | null;
      citta: string | null;
    } | null;
  };
  const prossimiEventi = (
    (prossimiBiglietti.data ?? []) as unknown as EventoBiglietto[]
  )
    .filter((b) => b.eventi && new Date(b.eventi.data_inizio).getTime() > Date.now())
    .sort((a, b) =>
      a.eventi!.data_inizio < b.eventi!.data_inizio ? -1 : 1,
    )
    .slice(0, 3);

  type PrenBnb = {
    id: string;
    data_check_in: string;
    data_check_out: string;
    num_ospiti: number;
    stato: string;
    camere: { nome: string; strutture: { nome: string; citta: string } | null } | null;
  };
  const prossimiSoggiorni = (
    (prossimiBnb.data ?? []) as unknown as PrenBnb[]
  ).filter((p) => p.camere?.strutture);

  type OrdRist = {
    id: string;
    totale_cents: number;
    stato: string;
    created_at: string;
    ristoranti: { nome: string } | null;
  };
  type OrdShop = {
    id: string;
    totale_cents: number;
    stato: string;
    created_at: string;
    shops: { nome: string } | null;
  };
  const ordini = [
    ...(((ultimiOrdiniRist.data ?? []) as unknown as OrdRist[]).map((o) => ({
      kind: "ristorante" as const,
      id: o.id,
      nome: o.ristoranti?.nome ?? "Ristorante",
      totale: o.totale_cents,
      stato: o.stato,
      created_at: o.created_at,
    }))),
    ...(((ultimiOrdiniShop.data ?? []) as unknown as OrdShop[]).map((o) => ({
      kind: "shop" as const,
      id: o.id,
      nome: o.shops?.nome ?? "Shop",
      totale: o.totale_cents,
      stato: o.stato,
      created_at: o.created_at,
    }))),
  ]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 3);

  type CorsoRow = {
    id: string;
    corso_id: string;
    corsi: {
      id: string;
      titolo: string;
      durata_totale_secondi: number | null;
    } | null;
  };
  const corsi = (
    (continuaCorsi.data ?? []) as unknown as CorsoRow[]
  ).filter((r) => r.corsi);

  const greeting = nome ? `Ciao ${nome}!` : "Bentornato!";

  return (
    <BlockShell accent={ACCENT}>
      <BlockHeader
        emoji="👤"
        title="Il mio account"
        subtitle={`${greeting} Ecco la tua attività.`}
        accent={ACCENT}
        href="/dashboard/profilo"
        hrefLabel="Gestisci profilo"
      />

      <StatGrid>
        <MiniStat
          label="Biglietti attivi"
          value={formatNumber(bigliettiAttivi ?? 0)}
          icon={Ticket}
          accent={ACCENT}
          hint="Pronti per essere usati"
        />
        <MiniStat
          label="Prenotazioni 7 gg"
          value={formatNumber(prenotazioni7gg)}
          icon={CalendarClock}
          accent={ACCENT}
          hint="B&B, ristoranti, visite"
        />
        <MiniStat
          label="Ordini in corso"
          value={formatNumber(ordiniTot)}
          icon={ShoppingBag}
          accent={ACCENT}
          hint="Da preparare o spedire"
        />
        <MiniStat
          label="Corsi acquistati"
          value={formatNumber(corsiAcquistati ?? 0)}
          icon={GraduationCap}
          accent={ACCENT}
        />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <CardList
          title="Prossimi eventi"
          description="Conto alla rovescia per i tuoi biglietti."
          accent={ACCENT}
          href="/dashboard/biglietti"
          isEmpty={prossimiEventi.length === 0}
          emptyText="Nessun evento prenotato in arrivo."
        >
          {prossimiEventi.map((b) => (
            <ListRow
              key={b.id}
              primary={b.eventi!.titolo}
              secondary={`${b.eventi!.luogo ?? ""}${b.eventi!.citta ? ` · ${b.eventi!.citta}` : ""}`}
              trailing={countdown(b.eventi!.data_inizio)}
              href="/dashboard/biglietti"
            />
          ))}
        </CardList>

        <CardList
          title="Prossimi soggiorni"
          description="Le tue prenotazioni B&B in arrivo."
          accent={ACCENT}
          href="/dashboard/prenotazioni"
          isEmpty={prossimiSoggiorni.length === 0}
          emptyText="Nessun soggiorno prenotato."
        >
          {prossimiSoggiorni.map((p) => (
            <ListRow
              key={p.id}
              primary={
                <span className="flex items-center gap-1.5">
                  <Hotel className="size-3.5 text-muted-foreground" />
                  {p.camere?.strutture?.nome}
                </span>
              }
              secondary={`${p.camere?.nome} · ${p.num_ospiti} ospit${p.num_ospiti === 1 ? "e" : "i"}`}
              trailing={`${p.data_check_in} → ${p.data_check_out}`}
              href="/dashboard/prenotazioni"
            />
          ))}
        </CardList>

        <CardList
          title="Ultimi ordini"
          description="I tuoi acquisti recenti."
          accent={ACCENT}
          href="/dashboard/ordini"
          isEmpty={ordini.length === 0}
          emptyText="Nessun ordine recente."
        >
          {ordini.map((o) => (
            <ListRow
              key={`${o.kind}-${o.id}`}
              primary={
                <span className="flex items-center gap-1.5">
                  {o.kind === "shop" ? (
                    <ShoppingBag className="size-3.5 text-muted-foreground" />
                  ) : (
                    <UtensilsCrossed className="size-3.5 text-muted-foreground" />
                  )}
                  {o.nome}
                </span>
              }
              secondary={`${formatDateTime(o.created_at)} · ${o.stato.replace(/_/g, " ")}`}
              trailing={formatEurFromCents(o.totale)}
              href="/dashboard/ordini"
            />
          ))}
        </CardList>

        <CardList
          title="Continua a guardare"
          description="I corsi che hai acquistato."
          accent={ACCENT}
          href="/dashboard/miei-video"
          isEmpty={corsi.length === 0}
          emptyText="Non hai ancora acquistato corsi."
        >
          {corsi.map((c) => (
            <ListRow
              key={c.id}
              primary={
                <span className="flex items-center gap-1.5">
                  <PlayCircle className="size-3.5 text-muted-foreground" />
                  {c.corsi!.titolo}
                </span>
              }
              secondary={
                c.corsi!.durata_totale_secondi
                  ? `Durata: ${Math.round(c.corsi!.durata_totale_secondi / 60)} min`
                  : undefined
              }
              trailing="Riprendi"
              href={`/dashboard/miei-video/${c.corso_id}`}
            />
          ))}
        </CardList>
      </div>
    </BlockShell>
  );
}
