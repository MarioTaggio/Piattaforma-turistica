import type { Metadata } from "next";
import Link from "next/link";
import { Compass, MapPin } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHero } from "@/components/public/page-hero";
import { formatEurFromCents } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Virtual Tour — Piattaforma Turistica",
  description: "Tour virtuali a 360° delle attrazioni del territorio.",
};

export default async function VirtualTourPage() {
  const supabase = createAdminClient();

  const { data: tours } = await supabase
    .from("tour_virtuali")
    .select(
      "id, titolo, descrizione, gratuito, prezzo_cents, url_tour, attrazione_id, attrazioni:attrazione_id(id, nome, citta, immagini, stato)",
    )
    .eq("stato", "pubblicato");

  const visible = ((tours ?? []) as unknown as Array<{
    id: string;
    titolo: string;
    descrizione: string | null;
    gratuito: boolean;
    prezzo_cents: number;
    url_tour: string;
    attrazione_id: string;
    attrazioni: { id: string; nome: string; citta: string; immagini: string[]; stato: string } | null;
  }>).filter((t) => t.attrazioni?.stato === "pubblicato");

  return (
    <>
      <PageHero
        eyebrow="Virtual tour"
        title="Esplora il territorio a 360°"
        subtitle="Visita musei, palazzi storici e attrazioni naturali senza muoverti da casa."
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center text-sm text-muted-foreground">
            Stiamo preparando i primi tour virtuali. Torna presto!
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((t) => {
              const cover = t.attrazioni?.immagini?.[0] ?? null;
              const free = t.gratuito || t.prezzo_cents === 0;
              return (
                <Link
                  key={t.id}
                  href={`/infopoint/${t.attrazione_id}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <div className="relative aspect-video overflow-hidden bg-brand-50">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={cover}
                        alt={t.titolo}
                        className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="grid size-full place-items-center text-brand-700/60">
                        <Compass className="size-10" />
                      </div>
                    )}
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-700 shadow-sm">
                      <Compass className="size-3" />
                      Virtual tour
                    </span>
                    <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
                      {free ? "Gratuito" : formatEurFromCents(t.prezzo_cents)}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                      {t.attrazioni?.nome}
                    </p>
                    <h3 className="line-clamp-2 text-base font-semibold tracking-tight">
                      {t.titolo}
                    </h3>
                    {t.descrizione && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {t.descrizione}
                      </p>
                    )}
                    <div className="mt-auto flex items-center justify-between pt-2 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="size-3" />
                        {t.attrazioni?.citta}
                      </span>
                      <span className="font-medium text-brand-700">
                        Esplora →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
