import type { Metadata } from "next";
import { Hotel } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHero } from "@/components/public/page-hero";
import { FilterBar } from "@/components/public/filter-bar";
import { ListingCard } from "@/components/public/listing-card";
import { formatEurFromCents } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "B&B — Piattaforma Turistica",
  description: "B&B, agriturismi e strutture ricettive del territorio.",
};

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function PublicBnbPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const citta = (sp.citta as string | undefined)?.trim() ?? "";
  const stelle = (sp.stelle as string | undefined) ?? "";
  const prezzoMax = (sp.prezzoMax as string | undefined) ?? "";

  const supabase = createAdminClient();

  let strutQuery = supabase
    .from("strutture")
    .select("id, nome, descrizione, citta, stelle, immagini")
    .eq("stato", "pubblicato");

  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    strutQuery = strutQuery.or(`nome.ilike.${like},descrizione.ilike.${like}`);
  }
  if (citta) strutQuery = strutQuery.ilike("citta", `%${citta.replace(/[%_]/g, "")}%`);
  if (stelle) {
    const n = parseInt(stelle, 10);
    if (Number.isFinite(n)) strutQuery = strutQuery.gte("stelle", n);
  }

  const { data: strutture } = await strutQuery
    .order("nome", { ascending: true })
    .limit(48);

  const ids = ((strutture ?? []) as { id: string }[]).map((s) => s.id);
  const { data: camereRaw } = ids.length
    ? await supabase
        .from("camere")
        .select("struttura_id, prezzo_notte_cents")
        .in("struttura_id", ids)
        .eq("disponibile", true)
    : { data: [] as { struttura_id: string; prezzo_notte_cents: number }[] };

  const minPriceByStruct = new Map<string, number>();
  for (const c of (camereRaw ?? []) as { struttura_id: string; prezzo_notte_cents: number }[]) {
    const cur = minPriceByStruct.get(c.struttura_id);
    if (cur === undefined || c.prezzo_notte_cents < cur) {
      minPriceByStruct.set(c.struttura_id, c.prezzo_notte_cents);
    }
  }

  const filteredByPrice = prezzoMax
    ? ((strutture ?? []) as Array<{ id: string }>).filter((s) => {
        const p = minPriceByStruct.get(s.id);
        if (p === undefined) return false;
        const max = Math.round(Number(prezzoMax) * 100);
        return Number.isFinite(max) && p <= max;
      })
    : ((strutture ?? []) as Array<{ id: string }>);

  const visibleIds = new Set(filteredByPrice.map((s) => s.id));

  // Distinct city options
  const { data: citiesRaw } = await supabase
    .from("strutture")
    .select("citta")
    .eq("stato", "pubblicato");
  const cities = Array.from(
    new Set(
      ((citiesRaw ?? []) as { citta: string }[]).map((r) => r.citta),
    ),
  ).sort();

  return (
    <>
      <PageHero
        eyebrow="Soggiorni"
        title="B&B e strutture ricettive"
        subtitle="Cerca per città, stelle o budget. Tutte strutture verificate dai nostri gestori."
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <FilterBar
          fields={[
            { type: "search", param: "q", placeholder: "Cerca struttura…" },
            {
              type: "select",
              param: "citta",
              placeholder: "Tutte le città",
              options: cities.map((c) => ({ value: c, label: c })),
            },
            {
              type: "select",
              param: "stelle",
              placeholder: "Stelle (min)",
              options: [
                { value: "1", label: "1★ +" },
                { value: "2", label: "2★ +" },
                { value: "3", label: "3★ +" },
                { value: "4", label: "4★ +" },
                { value: "5", label: "5★" },
              ],
            },
            {
              type: "number",
              param: "prezzoMax",
              placeholder: "€/notte max",
              min: 0,
            },
          ]}
        />

        {filteredByPrice.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center text-sm text-muted-foreground">
            Nessuna struttura trovata con questi filtri.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {((strutture ?? []) as unknown as Array<{
              id: string;
              nome: string;
              descrizione: string | null;
              citta: string;
              stelle: number | null;
              immagini: string[];
            }>)
              .filter((s) => visibleIds.has(s.id))
              .map((s) => {
                const price = minPriceByStruct.get(s.id);
                return (
                  <ListingCard
                    key={s.id}
                    href={`/bnb/${s.id}`}
                    title={s.nome}
                    description={s.descrizione}
                    imageUrl={s.immagini?.[0] ?? null}
                    fallbackIcon={Hotel}
                    meta={s.citta}
                    topBadge={
                      s.stelle ? `${"★".repeat(s.stelle)}` : undefined
                    }
                    price={
                      price !== undefined
                        ? `da ${formatEurFromCents(price)} / notte`
                        : undefined
                    }
                    cta="Vedi camere"
                  />
                );
              })}
          </div>
        )}
      </div>

    </>
  );
}
