import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Star, Wifi } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatEurFromCents } from "@/lib/utils/format";

import { BnbBookingForm } from "./_components/booking-form";

export const metadata: Metadata = {
  title: "Struttura — Piattaforma Turistica",
};

export default async function StrutturaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: struttura }, { data: camere }] = await Promise.all([
    supabase
      .from("strutture")
      .select(
        "id, nome, descrizione, indirizzo, citta, cap, stelle, servizi, immagini, stato",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("camere")
      .select("id, nome, descrizione, capacita, prezzo_notte_cents, disponibile")
      .eq("struttura_id", id)
      .order("prezzo_notte_cents", { ascending: true }),
  ]);

  if (!struttura || (struttura as { stato: string }).stato !== "pubblicato")
    notFound();

  const s = struttura as {
    id: string;
    nome: string;
    descrizione: string | null;
    indirizzo: string;
    citta: string;
    cap: string | null;
    stelle: number | null;
    servizi: string[];
    immagini: string[];
  };

  const cam = ((camere ?? []) as Array<{
    id: string;
    nome: string;
    descrizione: string | null;
    capacita: number;
    prezzo_notte_cents: number;
    disponibile: boolean;
  }>).filter((c) => c.disponibile);

  const cover = s.immagini?.[0] ?? null;
  const gallery = (s.immagini ?? []).slice(1, 5);

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/bnb"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Tutte le strutture
      </Link>

      {/* gallery */}
      <div className="mt-6 grid gap-3 lg:grid-cols-[2fr_1fr]">
        <div className="overflow-hidden rounded-3xl border border-border bg-brand-50">
          <div className="relative aspect-[16/9]">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={cover} alt={s.nome} className="size-full object-cover" />
            ) : (
              <div className="grid size-full place-items-center text-brand-700/50">
                <MapPin className="size-12" />
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {gallery.length > 0
            ? gallery.map((src, i) => (
                <div
                  key={i}
                  className="overflow-hidden rounded-2xl border border-border bg-brand-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt="" className="aspect-square w-full object-cover" />
                </div>
              ))
            : Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-square rounded-2xl border border-dashed border-border bg-muted/40"
                />
              ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-6">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
              Struttura
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {s.nome}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {s.indirizzo}, {s.citta}
                {s.cap ? ` · ${s.cap}` : ""}
              </span>
              {s.stelle && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <Star className="size-3.5 fill-current" />
                  {s.stelle}
                </span>
              )}
            </div>
          </header>

          {s.descrizione && (
            <p className="whitespace-pre-line text-base leading-relaxed text-foreground/80">
              {s.descrizione}
            </p>
          )}

          {s.servizi?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Servizi inclusi
              </h3>
              <ul className="flex flex-wrap gap-2">
                {s.servizi.map((srv) => (
                  <li
                    key={srv}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                  >
                    <Wifi className="size-3" />
                    {srv}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Camere
            </h3>
            {cam.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                Nessuna camera disponibile al momento.
              </p>
            ) : (
              <ul className="space-y-2">
                {cam.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold">{c.nome}</p>
                      {c.descrizione && (
                        <p className="text-xs text-muted-foreground">
                          {c.descrizione}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                        Fino a {c.capacita} ospiti
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-foreground">
                        {formatEurFromCents(c.prezzo_notte_cents)}
                      </p>
                      <p className="text-[10px] uppercase text-muted-foreground">
                        per notte
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <h3 className="mb-4 text-base font-semibold">Prenota il tuo soggiorno</h3>
          <BnbBookingForm strutturaId={s.id} camere={cam} />
        </aside>
      </div>
    </article>
  );
}
