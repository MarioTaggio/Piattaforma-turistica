"use client";

import Image from "next/image";
import { useState } from "react";
import { CalendarDays, MapPin, X } from "lucide-react";

import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  formatDateTime,
  formatEurFromCents,
} from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type Biglietto = {
  id: string;
  codice: string;
  stato: string;
  prezzo_pagato_cents: number;
  evento: {
    titolo: string | null;
    data_inizio: string | null;
    luogo: string | null;
    citta: string | null;
    immagine_url: string | null;
  } | null;
  qrDataUrl: string;
};

type Tab = "valido" | "utilizzato" | "rimborsato";

const TABS: { value: Tab; label: string; match: string[] }[] = [
  { value: "valido", label: "Validi", match: ["valido"] },
  { value: "utilizzato", label: "Utilizzati", match: ["utilizzato"] },
  { value: "rimborsato", label: "Rimborsati", match: ["rimborsato", "annullato"] },
];

export function BigliettiView({ biglietti }: { biglietti: Biglietto[] }) {
  const [active, setActive] = useState<Tab>("valido");
  const [modal, setModal] = useState<Biglietto | null>(null);

  const counts = TABS.reduce<Record<Tab, number>>(
    (acc, t) => {
      acc[t.value] = biglietti.filter((b) => t.match.includes(b.stato)).length;
      return acc;
    },
    { valido: 0, utilizzato: 0, rimborsato: 0 },
  );

  const filtered = biglietti.filter((b) =>
    TABS.find((t) => t.value === active)!.match.includes(b.stato),
  );

  return (
    <>
      <nav className="inline-flex rounded-xl bg-muted/40 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setActive(t.value)}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition",
              active === t.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {counts[t.value] > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-brand-100 px-1.5 text-[10px] font-bold text-brand-700">
                {counts[t.value]}
              </span>
            )}
          </button>
        ))}
      </nav>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nessun biglietto in questa categoria.
        </p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((b) => {
            const ev = b.evento;
            return (
              <article
                key={b.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                {ev?.immagine_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={ev.immagine_url}
                    alt={ev.titolo ?? ""}
                    className="h-32 w-full object-cover"
                  />
                )}
                <div className="flex flex-col gap-4 p-5 sm:flex-row">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="truncate text-base font-semibold">
                        {ev?.titolo ?? "Evento eliminato"}
                      </h3>
                      <StatusBadge kind="biglietto" value={b.stato} />
                    </div>

                    {ev && (
                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        {ev.data_inizio && (
                          <li className="flex items-center gap-2">
                            <CalendarDays className="size-3.5 shrink-0" />
                            {formatDateTime(ev.data_inizio)}
                          </li>
                        )}
                        {ev.luogo && (
                          <li className="flex items-center gap-2">
                            <MapPin className="size-3.5 shrink-0" />
                            {ev.luogo}
                            {ev.citta ? `, ${ev.citta}` : ""}
                          </li>
                        )}
                      </ul>
                    )}

                    <div className="flex items-center justify-between border-t border-border pt-3 text-xs">
                      <span className="text-muted-foreground">Codice</span>
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                        {b.codice.slice(0, 8)}…
                      </code>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Prezzo pagato</span>
                      <span className="font-medium">
                        {formatEurFromCents(b.prezzo_pagato_cents)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModal(b)}
                    className="flex shrink-0 flex-col items-center gap-1.5"
                    aria-label="Ingrandisci QR"
                  >
                    <Image
                      src={b.qrDataUrl}
                      alt={`QR ${b.codice}`}
                      width={120}
                      height={120}
                      unoptimized
                      className="rounded-lg ring-1 ring-border transition hover:ring-brand-300"
                    />
                    <span className="text-[10px] uppercase tracking-wider text-brand-700">
                      Clicca per ingrandire
                    </span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 p-4"
          onClick={() => setModal(null)}
        >
          <div
            className="relative w-full max-w-sm rounded-2xl bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setModal(null)}
              aria-label="Chiudi"
              className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg hover:bg-muted"
            >
              <X className="size-4" />
            </button>
            <div className="flex flex-col items-center gap-3">
              <Image
                src={modal.qrDataUrl}
                alt={`QR ${modal.codice}`}
                width={300}
                height={300}
                unoptimized
                className="rounded-xl ring-1 ring-border"
              />
              <h3 className="text-center text-lg font-semibold">
                {modal.evento?.titolo ?? "Evento"}
              </h3>
              {modal.evento?.data_inizio && (
                <p className="text-sm text-muted-foreground">
                  {formatDateTime(modal.evento.data_inizio)}
                </p>
              )}
              <p className="rounded-md bg-muted px-3 py-1 font-mono text-xs">
                {modal.codice}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
