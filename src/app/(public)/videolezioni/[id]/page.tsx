import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, GraduationCap, PlayCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDuration,
  formatEurFromCents,
} from "@/lib/utils/format";
import { ReviewsSection } from "@/components/recensioni/reviews-section";

import { BuyCorsoButton } from "./_components/buy-corso";

export const metadata: Metadata = {
  title: "Corso — Piattaforma Turistica",
};

export default async function CorsoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const tNav = await getTranslations("nav");
  const tDetail = await getTranslations("detail");
  const tCommon = await getTranslations("common");

  const [{ data: corso }, { data: lezioni }] = await Promise.all([
    supabase
      .from("corsi")
      .select(
        "id, titolo, descrizione, livello, prezzo_cents, immagine_copertina, durata_totale_secondi, stato",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("video_lezioni")
      .select("id, titolo, descrizione, durata_secondi, ordine, anteprima_gratuita, video_url")
      .eq("corso_id", id)
      .order("ordine", { ascending: true }),
  ]);

  if (!corso || (corso as { stato: string }).stato !== "pubblicato") notFound();

  const c = corso as {
    id: string;
    titolo: string;
    descrizione: string | null;
    livello: string | null;
    prezzo_cents: number;
    immagine_copertina: string | null;
    durata_totale_secondi: number | null;
  };
  const lez = ((lezioni ?? []) as Array<{
    id: string;
    titolo: string;
    descrizione: string | null;
    durata_secondi: number;
    ordine: number;
    anteprima_gratuita: boolean;
    video_url: string;
  }>);

  const preview = lez.find((l) => l.anteprima_gratuita);
  const free = c.prezzo_cents === 0;

  return (
    <article className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/videolezioni"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {tDetail("backToAll")}
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-6">
          <div className="overflow-hidden rounded-3xl border border-border bg-brand-50">
            {preview ? (
              <video
                src={preview.video_url}
                controls
                playsInline
                poster={c.immagine_copertina ?? undefined}
                className="aspect-video w-full bg-black"
              />
            ) : c.immagine_copertina ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={c.immagine_copertina}
                alt={c.titolo}
                className="aspect-video w-full object-cover"
              />
            ) : (
              <div className="grid aspect-video w-full place-items-center text-brand-700/50">
                <PlayCircle className="size-16" />
              </div>
            )}
          </div>

          <header className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
              {tNav("videolezioni")}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {c.titolo}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {c.livello && (
                <span className="inline-flex items-center gap-1.5">
                  <GraduationCap className="size-3.5" />
                  <span className="capitalize">{c.livello}</span>
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {formatDuration(c.durata_totale_secondi ?? 0)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <PlayCircle className="size-3.5" />
                {lez.length} {tDetail("lessons").toLowerCase()}
              </span>
            </div>
          </header>

          {c.descrizione && (
            <p className="whitespace-pre-line text-base text-foreground/80">
              {c.descrizione}
            </p>
          )}

          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              {tDetail("lessons")}
            </h3>
            {lez.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
                {tDetail("noProductsYet")}
              </p>
            ) : (
              <ul className="space-y-2">
                {lez.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-2xl border border-border bg-card p-4"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-sm font-semibold text-brand-700">
                        {l.ordine}
                      </span>
                      <div>
                        <p className="text-sm font-medium">{l.titolo}</p>
                        {l.descrizione && (
                          <p className="text-xs text-muted-foreground">
                            {l.descrizione}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {l.anteprima_gratuita && (
                        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                          {tDetail("preview")}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(l.durata_secondi)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {tCommon("price")}
          </p>
          <p className="mt-1 text-3xl font-semibold text-foreground">
            {free ? tCommon("free") : formatEurFromCents(c.prezzo_cents)}
          </p>
          <div className="mt-4">
            <BuyCorsoButton corsoId={c.id} free={free} />
          </div>
        </aside>
      </div>

      <div className="mt-12">
        <ReviewsSection target={{ corso_id: c.id }} />
      </div>
    </article>
  );
}
