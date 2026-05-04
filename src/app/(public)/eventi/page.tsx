import type { Metadata } from "next";
import { CalendarDays } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHero } from "@/components/public/page-hero";
import { FilterBar } from "@/components/public/filter-bar";
import { ListingCard } from "@/components/public/listing-card";
import { formatDateTime, formatEurFromCents } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Eventi — Piattaforma Turistica",
  description: "Festival, concerti, mercatini e appuntamenti del territorio.",
};

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function PublicEventiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const citta = (sp.citta as string | undefined)?.trim() ?? "";
  const dataDa = (sp.dataDa as string | undefined) ?? "";
  const prezzoMax = (sp.prezzoMax as string | undefined) ?? "";

  const supabase = createAdminClient();
  let query = supabase
    .from("eventi")
    .select(
      "id, titolo, descrizione, citta, luogo, data_inizio, prezzo_cents, immagine_url",
    )
    .eq("stato", "pubblicato");

  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`titolo.ilike.${like},luogo.ilike.${like}`);
  }
  if (citta) query = query.ilike("citta", `%${citta.replace(/[%_]/g, "")}%`);
  if (dataDa) query = query.gte("data_inizio", new Date(dataDa).toISOString());
  if (prezzoMax) {
    const cents = Math.max(0, Math.round(Number(prezzoMax) * 100));
    if (Number.isFinite(cents)) query = query.lte("prezzo_cents", cents);
  }

  const { data } = await query
    .order("data_inizio", { ascending: true })
    .limit(48);

  // Distinct city options for filter
  const { data: citiesRaw } = await supabase
    .from("eventi")
    .select("citta")
    .eq("stato", "pubblicato")
    .not("citta", "is", null);
  const cities = Array.from(
    new Set(
      ((citiesRaw ?? []) as { citta: string | null }[])
        .map((r) => r.citta)
        .filter((c): c is string => !!c),
    ),
  ).sort();

  return (
    <>
      <PageHero
        eyebrow="Eventi"
        title="Cosa succede vicino a te"
        subtitle="Filtra per data, città o prezzo. Tutti gli eventi pubblicati dai nostri gestori, in un colpo d'occhio."
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <FilterBar
          fields={[
            { type: "search", param: "q", placeholder: "Cerca evento o luogo…" },
            {
              type: "select",
              param: "citta",
              placeholder: "Tutte le città",
              options: cities.map((c) => ({ value: c, label: c })),
            },
            { type: "date", param: "dataDa", placeholder: "Da" },
            {
              type: "number",
              param: "prezzoMax",
              placeholder: "Prezzo max (€)",
              min: 0,
            },
          ]}
        />

        {(data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center text-sm text-muted-foreground">
            Nessun evento trovato con questi filtri.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {((data ?? []) as unknown as Array<{
              id: string;
              titolo: string;
              descrizione: string | null;
              citta: string | null;
              luogo: string;
              data_inizio: string;
              prezzo_cents: number;
              immagine_url: string | null;
            }>).map((e) => (
              <ListingCard
                key={e.id}
                href={`/eventi/${e.id}`}
                title={e.titolo}
                description={e.descrizione}
                imageUrl={e.immagine_url}
                fallbackIcon={CalendarDays}
                meta={`${formatDateTime(e.data_inizio)} · ${e.luogo}`}
                topBadge={e.citta ?? undefined}
                price={
                  e.prezzo_cents === 0
                    ? "Gratis"
                    : formatEurFromCents(e.prezzo_cents)
                }
                cta="Acquista biglietto"
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
