import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { CalendarDays, MapPin, Ticket, Compass } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateTime,
  formatEurFromCents,
} from "@/lib/utils/format";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "I miei biglietti — Piattaforma Turistica",
};

type BigliettoRow = {
  id: string;
  codice: string;
  stato: string;
  prezzo_pagato_cents: number;
  created_at: string;
  utilizzato_at: string | null;
  evento_id: string;
  eventi: {
    titolo: string;
    descrizione: string | null;
    data_inizio: string;
    data_fine: string;
    luogo: string;
    citta: string | null;
    immagine_url: string | null;
  } | null;
};

export default async function BigliettiPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("biglietti")
    .select(
      `id, codice, stato, prezzo_pagato_cents, created_at, utilizzato_at,
       evento_id,
       eventi ( titolo, descrizione, data_inizio, data_fine, luogo, citta, immagine_url )`,
    )
    .eq("utente_id", user.id)
    .order("created_at", { ascending: false });

  const biglietti = (data ?? []) as unknown as BigliettoRow[];

  // Generate QR codes server-side, in parallel.
  const qrDataUrls = await Promise.all(
    biglietti.map((b) =>
      QRCode.toDataURL(b.codice, {
        margin: 1,
        width: 200,
        color: { dark: "#1B4332", light: "#FFFFFF" },
      }),
    ),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="I miei biglietti"
        subtitle="Tutti i biglietti che hai acquistato per eventi sulla piattaforma."
      />

      {biglietti.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Nessun biglietto ancora"
          description="Quando acquisterai un biglietto per un evento lo troverai qui, pronto da mostrare all'ingresso."
          action={
            <Button
              render={<Link href="/eventi" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Compass className="mr-1.5 size-4" />
              Esplora eventi
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {biglietti.map((b, i) => {
            const evento = b.eventi;
            return (
              <article
                key={b.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                {evento?.immagine_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={evento.immagine_url}
                    alt={evento.titolo}
                    className="h-32 w-full object-cover"
                  />
                )}
                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="truncate text-base font-semibold">
                        {evento?.titolo ?? "Evento eliminato"}
                      </h3>
                      <StatusBadge kind="biglietto" value={b.stato} />
                    </div>

                    {evento && (
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2">
                          <CalendarDays className="size-3.5 shrink-0" />
                          {formatDateTime(evento.data_inizio)}
                        </li>
                        <li className="flex items-center gap-2">
                          <MapPin className="size-3.5 shrink-0" />
                          {evento.luogo}
                          {evento.citta ? `, ${evento.citta}` : ""}
                        </li>
                      </ul>
                    )}

                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                      <span className="text-muted-foreground">Codice</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                        {b.codice.slice(0, 8)}…
                      </code>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        Prezzo pagato
                      </span>
                      <span className="font-medium">
                        {formatEurFromCents(b.prezzo_pagato_cents)}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-center gap-1.5">
                    <Image
                      src={qrDataUrls[i]}
                      alt={`QR code biglietto ${b.codice}`}
                      width={120}
                      height={120}
                      unoptimized
                      className="rounded-lg ring-1 ring-border"
                    />
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Scansiona all&apos;ingresso
                    </span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
