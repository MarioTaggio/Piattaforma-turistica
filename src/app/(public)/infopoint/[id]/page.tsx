import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Compass, Landmark, MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";

import { VisitaForm } from "./_components/visita-form";

export const metadata: Metadata = {
  title: "Attrazione — Piattaforma Turistica",
};

export default async function AttrazioneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const tNav = await getTranslations("nav");
  const tDetail = await getTranslations("detail");

  const [{ data: attrazione }, { data: visite }, { data: tour }] =
    await Promise.all([
      supabase
        .from("attrazioni")
        .select(
          "id, nome, descrizione, indirizzo, citta, categoria, orari, immagini, stato",
        )
        .eq("id", id)
        .single(),
      supabase
        .from("visite_guidate")
        .select(
          "id, titolo, data_ora, durata_minuti, prezzo_cents, posti_disponibili, lingua, stato",
        )
        .eq("attrazione_id", id)
        .eq("stato", "pubblicato")
        .order("data_ora", { ascending: true }),
      supabase
        .from("tour_virtuali")
        .select("id, titolo, descrizione, url_tour, gratuito, prezzo_cents, stato")
        .eq("attrazione_id", id)
        .eq("stato", "pubblicato")
        .limit(1)
        .maybeSingle(),
    ]);

  if (!attrazione || (attrazione as { stato: string }).stato !== "pubblicato")
    notFound();

  const a = attrazione as {
    id: string;
    nome: string;
    descrizione: string | null;
    indirizzo: string;
    citta: string;
    categoria: string | null;
    orari: { raw?: string } | null;
    immagini: string[];
  };

  const cover = a.immagini?.[0] ?? null;
  const orari = a.orari?.raw;
  const v = ((visite ?? []) as Array<{
    id: string;
    titolo: string;
    data_ora: string;
    durata_minuti: number;
    prezzo_cents: number;
    posti_disponibili: number;
    lingua: string;
  }>);
  const t = tour as {
    id: string;
    titolo: string;
    descrizione: string | null;
    url_tour: string;
    gratuito: boolean;
    prezzo_cents: number;
  } | null;

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/infopoint"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {tDetail("backToAll")}
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card">
        <div className="relative aspect-[16/6] bg-brand-50">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt={a.nome} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-brand-700/50">
              <Landmark className="size-14" />
            </div>
          )}
          {a.categoria && (
            <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 shadow-sm">
              {a.categoria}
            </span>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-6">
          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
              {tNav("infopoint")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {a.nome}
            </h1>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {a.indirizzo}, {a.citta}
            </span>
          </header>

          {a.descrizione && (
            <p className="whitespace-pre-line text-base leading-relaxed text-foreground/80">
              {a.descrizione}
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
                <p className="mt-1 whitespace-pre-line text-sm">{orari}</p>
              </div>
            </div>
          )}

          {t && (
            <section className="overflow-hidden rounded-2xl border border-border bg-card">
              <header className="flex items-center justify-between border-b border-border px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-lg bg-brand-50 text-brand-700">
                    <Compass className="size-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{t.titolo}</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      Virtual tour
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                  {t.gratuito || t.prezzo_cents === 0
                    ? "Gratuito"
                    : "A pagamento"}
                </span>
              </header>
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={t.url_tour}
                  title={t.titolo}
                  className="size-full"
                  allow="accelerometer; gyroscope; xr-spatial-tracking; fullscreen"
                  allowFullScreen
                />
              </div>
              {t.descrizione && (
                <p className="px-5 py-3 text-sm text-muted-foreground">
                  {t.descrizione}
                </p>
              )}
            </section>
          )}
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <h3 className="mb-4 text-base font-semibold">{tNav("infopoint")}</h3>
          <VisitaForm attrazioneId={a.id} visite={v} />
        </aside>
      </div>
    </article>
  );
}
