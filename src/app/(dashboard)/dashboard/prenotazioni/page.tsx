import type { Metadata } from "next";
import Link from "next/link";
import {
  Hotel,
  UtensilsCrossed,
  CalendarDays,
  MapPin,
  Users,
  Compass,
  ClipboardList,
  Landmark,
  Globe,
} from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate,
  formatDateTime,
  formatEurFromCents,
  nightsBetween,
} from "@/lib/utils/format";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Le mie prenotazioni — Piattaforma Turistica",
};

type BnbRow = {
  id: string;
  data_check_in: string;
  data_check_out: string;
  num_ospiti: number;
  prezzo_totale_cents: number;
  stato: string;
  stato_pagamento: string;
  note: string | null;
  created_at: string;
  camere: {
    nome: string;
    strutture: {
      nome: string;
      citta: string;
      indirizzo: string;
    } | null;
  } | null;
};

type TavoloRow = {
  id: string;
  data_ora: string;
  num_ospiti: number;
  note: string | null;
  stato: string;
  created_at: string;
  tavoli: {
    numero: string;
    posizione: string | null;
    ristoranti: {
      nome: string;
      citta: string;
      indirizzo: string;
    } | null;
  } | null;
};

type VisitaRow = {
  id: string;
  num_partecipanti: number;
  prezzo_totale_cents: number;
  stato: string;
  stato_pagamento: string;
  created_at: string;
  visite_guidate: {
    titolo: string;
    data_ora: string;
    durata_minuti: number;
    lingua: string;
    attrazioni: {
      nome: string;
      citta: string;
      indirizzo: string;
    } | null;
  } | null;
};

export default async function PrenotazioniPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const [{ data: bnbData }, { data: tavoloData }, { data: visitaData }] =
    await Promise.all([
      supabase
        .from("prenotazioni_bnb")
        .select(
          `id, data_check_in, data_check_out, num_ospiti, prezzo_totale_cents,
           stato, stato_pagamento, note, created_at,
           camere ( nome, strutture ( nome, citta, indirizzo ) )`,
        )
        .eq("utente_id", user.id)
        .order("data_check_in", { ascending: false }),
      supabase
        .from("prenotazioni_tavolo")
        .select(
          `id, data_ora, num_ospiti, note, stato, created_at,
           tavoli ( numero, posizione, ristoranti ( nome, citta, indirizzo ) )`,
        )
        .eq("utente_id", user.id)
        .order("data_ora", { ascending: false }),
      supabase
        .from("prenotazioni_visita")
        .select(
          `id, num_partecipanti, prezzo_totale_cents, stato, stato_pagamento, created_at,
           visite_guidate ( titolo, data_ora, durata_minuti, lingua,
             attrazioni ( nome, citta, indirizzo ) )`,
        )
        .eq("utente_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const bnb = (bnbData ?? []) as unknown as BnbRow[];
  const tavoli = (tavoloData ?? []) as unknown as TavoloRow[];
  const visite = (visitaData ?? []) as unknown as VisitaRow[];
  const total = bnb.length + tavoli.length + visite.length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Le mie prenotazioni"
        subtitle="Soggiorni in B&B e tavoli prenotati nei ristoranti."
      />

      {total === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nessuna prenotazione attiva"
          description="Quando prenoterai un B&B o un tavolo al ristorante lo troverai qui, con tutti i dettagli."
          action={
            <Button
              render={<Link href="/bnb" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Compass className="mr-1.5 size-4" />
              Esplora alloggi
            </Button>
          }
        />
      ) : (
        <>
          <Section
            icon={Hotel}
            title="Soggiorni in B&B"
            count={bnb.length}
            empty="Nessun soggiorno prenotato."
          >
            {bnb.map((b) => {
              const struct = b.camere?.strutture;
              const nights = nightsBetween(b.data_check_in, b.data_check_out);
              return (
                <article
                  key={b.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">
                        {struct?.nome ?? "Struttura eliminata"}
                      </h3>
                      {b.camere?.nome && (
                        <p className="text-sm text-muted-foreground">
                          Camera: {b.camere.nome}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge kind="prenotazione" value={b.stato} />
                      <StatusBadge
                        kind="pagamento"
                        value={b.stato_pagamento}
                      />
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="size-3.5 shrink-0" /> Check-in
                    </div>
                    <div className="text-right font-medium">
                      {formatDate(b.data_check_in)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="size-3.5 shrink-0" /> Check-out
                    </div>
                    <div className="text-right font-medium">
                      {formatDate(b.data_check_out)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-3.5 shrink-0" /> Ospiti
                    </div>
                    <div className="text-right font-medium">
                      {b.num_ospiti}
                    </div>
                    {struct && (
                      <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" /> Indirizzo
                        </div>
                        <div className="truncate text-right font-medium">
                          {struct.indirizzo}, {struct.citta}
                        </div>
                      </>
                    )}
                  </dl>

                  <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted-foreground">
                      {nights} nott{nights === 1 ? "e" : "i"}
                    </span>
                    <span className="text-base font-semibold">
                      {formatEurFromCents(b.prezzo_totale_cents)}
                    </span>
                  </div>
                </article>
              );
            })}
          </Section>

          <Section
            icon={UtensilsCrossed}
            title="Tavoli al ristorante"
            count={tavoli.length}
            empty="Nessun tavolo prenotato."
          >
            {tavoli.map((t) => {
              const rist = t.tavoli?.ristoranti;
              return (
                <article
                  key={t.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold">
                        {rist?.nome ?? "Ristorante eliminato"}
                      </h3>
                      {t.tavoli && (
                        <p className="text-sm text-muted-foreground">
                          Tavolo {t.tavoli.numero}
                          {t.tavoli.posizione ? ` · ${t.tavoli.posizione}` : ""}
                        </p>
                      )}
                    </div>
                    <StatusBadge kind="prenotazione" value={t.stato} />
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarDays className="size-3.5 shrink-0" /> Quando
                    </div>
                    <div className="text-right font-medium">
                      {formatDateTime(t.data_ora)}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-3.5 shrink-0" /> Ospiti
                    </div>
                    <div className="text-right font-medium">
                      {t.num_ospiti}
                    </div>
                    {rist && (
                      <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" /> Indirizzo
                        </div>
                        <div className="truncate text-right font-medium">
                          {rist.indirizzo}, {rist.citta}
                        </div>
                      </>
                    )}
                  </dl>

                  {t.note && (
                    <p className="mt-3 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {t.note}
                    </p>
                  )}
                </article>
              );
            })}
          </Section>

          <Section
            icon={Landmark}
            title="Visite guidate"
            count={visite.length}
            empty="Nessuna visita prenotata."
          >
            {visite.map((v) => {
              const visita = v.visite_guidate;
              const attr = visita?.attrazioni;
              return (
                <article
                  key={v.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold">
                        {visita?.titolo ?? "Visita"}
                      </h3>
                      {attr && (
                        <p className="text-sm text-muted-foreground">
                          {attr.nome}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <StatusBadge kind="prenotazione" value={v.stato} />
                      <StatusBadge
                        kind="pagamento"
                        value={v.stato_pagamento}
                      />
                    </div>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {visita && (
                      <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <CalendarDays className="size-3.5 shrink-0" /> Quando
                        </div>
                        <div className="text-right font-medium">
                          {formatDateTime(visita.data_ora)}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Globe className="size-3.5 shrink-0" /> Lingua
                        </div>
                        <div className="text-right font-medium uppercase">
                          {visita.lingua}
                        </div>
                      </>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Users className="size-3.5 shrink-0" /> Partecipanti
                    </div>
                    <div className="text-right font-medium">
                      {v.num_partecipanti}
                    </div>
                    {attr && (
                      <>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="size-3.5 shrink-0" /> Dove
                        </div>
                        <div className="truncate text-right font-medium">
                          {attr.indirizzo}, {attr.citta}
                        </div>
                      </>
                    )}
                  </dl>

                  <div className="mt-4 flex items-center justify-end border-t border-border pt-3">
                    <span className="text-base font-semibold">
                      {v.prezzo_totale_cents === 0
                        ? "Gratis"
                        : formatEurFromCents(v.prezzo_totale_cents)}
                    </span>
                  </div>
                </article>
              );
            })}
          </Section>
        </>
      )}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  empty,
  children,
}: {
  icon: typeof Hotel;
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <header className="flex items-center gap-2">
        <span className="grid size-8 place-items-center rounded-xl bg-brand-50 text-brand-700">
          <Icon className="size-4" />
        </span>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </header>
      {count === 0 ? (
        <p className="rounded-2xl border border-dashed border-border bg-card px-5 py-6 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">{children}</div>
      )}
    </section>
  );
}
