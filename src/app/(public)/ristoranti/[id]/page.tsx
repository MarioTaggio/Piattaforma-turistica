import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Mail,
  MapPin,
  Phone,
  UtensilsCrossed,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatEurFromCents } from "@/lib/utils/format";

import { TavoloBookingForm } from "./_components/booking-form";

export const metadata: Metadata = {
  title: "Ristorante — Piattaforma Turistica",
};

export default async function RistoranteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const tNav = await getTranslations("nav");
  const tDetail = await getTranslations("detail");

  const [{ data: ristorante }, { data: tavoli }, { data: prodotti }] =
    await Promise.all([
      supabase
        .from("ristoranti")
        .select(
          "id, nome, descrizione, indirizzo, citta, telefono, email, tipo_cucina, orari, immagini, stato, prenotazione_attiva",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("tavoli")
        .select("id, numero, posti, posizione, attivo")
        .eq("ristorante_id", id)
        .eq("attivo", true)
        .order("posti", { ascending: true }),
      supabase
        .from("prodotti")
        .select("id, nome, descrizione, prezzo_cents, categoria, immagine_url")
        .eq("ristorante_id", id)
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true }),
    ]);

  if (!ristorante || (ristorante as { stato: string }).stato !== "pubblicato")
    notFound();

  const r = ristorante as {
    id: string;
    nome: string;
    descrizione: string | null;
    indirizzo: string;
    citta: string;
    telefono: string | null;
    email: string | null;
    tipo_cucina: string | null;
    orari: { raw?: string } | null;
    immagini: string[];
    prenotazione_attiva: boolean | null;
  };
  const prenotazioniAttive = !!r.prenotazione_attiva;
  const tavoliData = ((tavoli ?? []) as Array<{
    id: string;
    numero: string;
    posti: number;
    posizione: string | null;
    attivo: boolean;
  }>).filter((t) => t.attivo);

  const cover = r.immagini?.[0] ?? null;
  const orari = r.orari?.raw;

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/ristoranti"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {tDetail("backToAll")}
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative aspect-[16/6] bg-brand-50">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={r.nome} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-brand-700/50">
              <UtensilsCrossed className="size-14" />
            </div>
          )}
          {r.tipo_cucina && (
            <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 shadow-sm">
              {r.tipo_cucina}
            </span>
          )}
        </div>
      </div>

      <div
        className={
          prenotazioniAttive
            ? "mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]"
            : "mt-8"
        }
      >
        <section className="space-y-8">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
              {tNav("ristoranti")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {r.nome}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-3.5" />
                {r.indirizzo}, {r.citta}
              </span>
              {r.telefono && (
                <span className="inline-flex items-center gap-1.5">
                  <Phone className="size-3.5" />
                  {r.telefono}
                </span>
              )}
              {r.email && (
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="size-3.5" />
                  {r.email}
                </span>
              )}
            </div>
          </header>

          {r.descrizione && (
            <p className="whitespace-pre-line text-base leading-relaxed text-foreground/80">
              {r.descrizione}
            </p>
          )}

          {orari && (
            <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/20 p-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                <Clock className="size-4" />
              </span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {tDetail("openingHours")}
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                  {orari}
                </p>
              </div>
            </div>
          )}

          {(() => {
            const items = (prodotti ?? []) as Array<{
              id: string;
              nome: string;
              descrizione: string | null;
              prezzo_cents: number;
              categoria: string | null;
              immagine_url: string | null;
            }>;
            if (items.length === 0) return null;
            const groups = new Map<string, typeof items>();
            for (const p of items) {
              const key = p.categoria?.trim() || "Altro";
              const arr = groups.get(key) ?? [];
              arr.push(p);
              groups.set(key, arr);
            }
            return (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold tracking-tight">
                  {tDetail("menu")}
                </h2>
                {Array.from(groups.entries()).map(([categoria, list]) => (
                  <div key={categoria}>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-700">
                      {categoria}
                    </h3>
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {list.map((p) => (
                        <li
                          key={p.id}
                          className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3"
                        >
                          {p.immagine_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.immagine_url}
                              alt={p.nome}
                              className="size-16 shrink-0 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                              <UtensilsCrossed className="size-5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="truncate text-sm font-medium">
                                {p.nome}
                              </p>
                              <span className="shrink-0 text-sm font-semibold">
                                {formatEurFromCents(p.prezzo_cents)}
                              </span>
                            </div>
                            {p.descrizione && (
                              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                {p.descrizione}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            );
          })()}
        </section>

        {prenotazioniAttive && (
          <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
            <h3 className="mb-4 text-base font-semibold">{tDetail("bookATable")}</h3>
            <TavoloBookingForm ristoranteId={r.id} tavoli={tavoliData} />
          </aside>
        )}
      </div>

      {!prenotazioniAttive && (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">
          {tDetail("bookingsDisabledRistorante")}
        </p>
      )}
    </article>
  );
}
