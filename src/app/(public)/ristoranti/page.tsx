import type { Metadata } from "next";
import { UtensilsCrossed } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHero } from "@/components/public/page-hero";
import { FilterBar } from "@/components/public/filter-bar";
import { ListingCard } from "@/components/public/listing-card";

export const metadata: Metadata = {
  title: "Ristoranti — Piattaforma Turistica",
};

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function PublicRistorantiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tNav = await getTranslations("nav");
  const tMod = await getTranslations("modules");
  const tCommon = await getTranslations("common");
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const citta = (sp.citta as string | undefined)?.trim() ?? "";
  const cucina = (sp.cucina as string | undefined)?.trim() ?? "";

  const supabase = createAdminClient();
  let query = supabase
    .from("ristoranti")
    .select("id, nome, descrizione, citta, tipo_cucina, immagini")
    .eq("stato", "pubblicato");

  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`nome.ilike.${like},descrizione.ilike.${like}`);
  }
  if (citta) query = query.ilike("citta", `%${citta.replace(/[%_]/g, "")}%`);
  if (cucina) query = query.ilike("tipo_cucina", `%${cucina.replace(/[%_]/g, "")}%`);

  const { data } = await query
    .order("nome", { ascending: true })
    .limit(48);

  // Distinct city & cucina options
  const { data: optsRaw } = await supabase
    .from("ristoranti")
    .select("citta, tipo_cucina")
    .eq("stato", "pubblicato");
  const cities = Array.from(
    new Set(((optsRaw ?? []) as { citta: string }[]).map((r) => r.citta)),
  ).sort();
  const cucine = Array.from(
    new Set(
      ((optsRaw ?? []) as { tipo_cucina: string | null }[])
        .map((r) => r.tipo_cucina)
        .filter((c): c is string => !!c),
    ),
  ).sort();

  return (
    <>
      <PageHero
        eyebrow={tNav("ristoranti")}
        title={tMod("ristoranti.title")}
        subtitle={tMod("ristoranti.subtitle")}
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <FilterBar
          fields={[
            { type: "search", param: "q", placeholder: tCommon("searchPlaceholder") },
            {
              type: "select",
              param: "citta",
              placeholder: tCommon("allCities"),
              options: cities.map((c) => ({ value: c, label: c })),
            },
            {
              type: "select",
              param: "cucina",
              placeholder: tCommon("all"),
              options: cucine.map((c) => ({ value: c, label: c })),
            },
          ]}
        />

        {(data ?? []).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center text-sm text-muted-foreground">
            {tCommon("noResults")}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {((data ?? []) as unknown as Array<{
              id: string;
              nome: string;
              descrizione: string | null;
              citta: string;
              tipo_cucina: string | null;
              immagini: string[];
            }>).map((r) => (
              <ListingCard
                key={r.id}
                href={`/ristoranti/${r.id}`}
                title={r.nome}
                description={r.descrizione}
                imageUrl={r.immagini?.[0] ?? null}
                fallbackIcon={UtensilsCrossed}
                meta={r.tipo_cucina ?? r.citta}
                topBadge={r.citta}
                cta={tMod("ristoranti.book")}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
