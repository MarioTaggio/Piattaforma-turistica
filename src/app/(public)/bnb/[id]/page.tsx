import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Wifi } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatEurFromCents } from "@/lib/utils/format";
import { ReviewsSection } from "@/components/recensioni/reviews-section";
import { BnbGallery } from "@/components/public/bnb-gallery";

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
  const tNav = await getTranslations("nav");
  const tDetail = await getTranslations("detail");

  const [{ data: struttura }, { data: camere }] = await Promise.all([
    supabase
      .from("strutture")
      .select(
        "id, nome, descrizione, indirizzo, citta, cap, servizi, immagini, stato, prenotazione_attiva",
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
    servizi: string[];
    immagini: string[];
    prenotazione_attiva: boolean | null;
  };

  const prenotazioniAttive = !!s.prenotazione_attiva;

  const cam = ((camere ?? []) as Array<{
    id: string;
    nome: string;
    descrizione: string | null;
    capacita: number;
    prezzo_notte_cents: number;
    disponibile: boolean;
  }>).filter((c) => c.disponibile);

  const immagini = (s.immagini ?? []).filter(Boolean) as string[];

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/bnb"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {tDetail("backToAll")}
      </Link>

      <div className="mt-6">
        <BnbGallery images={immagini} alt={s.nome} />
      </div>

      <div
        className={
          prenotazioniAttive
            ? "mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]"
            : "mt-8"
        }
      >
        <section className="space-y-6">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
              {tNav("bnb")}
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
                {tDetail("amenities")}
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
              {tDetail("rooms")}
            </h3>
            {cam.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                {tDetail("noProductsYet")}
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
                        {tDetail("upTo")} {c.capacita} {tDetail("guests")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-semibold text-foreground">
                        {formatEurFromCents(c.prezzo_notte_cents)}
                      </p>
                      <p className="text-[10px] uppercase text-muted-foreground">
                        {tDetail("perNight")}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {prenotazioniAttive && (
          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
            <h3 className="mb-4 text-base font-semibold">{tDetail("bookYourStay")}</h3>
            <BnbBookingForm strutturaId={s.id} camere={cam} />
          </aside>
        )}
      </div>

      {!prenotazioniAttive && (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
          {tDetail("bookingsDisabledBnb")}
        </p>
      )}

      <div className="mt-12">
        <ReviewsSection target={{ struttura_id: s.id }} />
      </div>
    </article>
  );
}
