import type { Metadata } from "next";
import { Landmark } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHero } from "@/components/public/page-hero";
import { FilterBar } from "@/components/public/filter-bar";
import { ListingCard } from "@/components/public/listing-card";

export const metadata: Metadata = {
  title: "Info point — Piattaforma Turistica",
};

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function PublicInfopointPage({
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
  const categoria = (sp.categoria as string | undefined)?.trim() ?? "";

  const supabase = createAdminClient();
  let query = supabase
    .from("attrazioni")
    .select("id, nome, descrizione, citta, categoria, immagini")
    .eq("stato", "pubblicato");

  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`nome.ilike.${like},descrizione.ilike.${like}`);
  }
  if (citta) query = query.ilike("citta", `%${citta.replace(/[%_]/g, "")}%`);
  if (categoria) query = query.ilike("categoria", `%${categoria.replace(/[%_]/g, "")}%`);

  const { data } = await query.order("nome", { ascending: true }).limit(48);

  // Distinct city/categoria options
  const { data: optsRaw } = await supabase
    .from("attrazioni")
    .select("citta, categoria")
    .eq("stato", "pubblicato");
  const cities = Array.from(
    new Set(((optsRaw ?? []) as { citta: string }[]).map((r) => r.citta)),
  ).sort();
  const cats = Array.from(
    new Set(
      ((optsRaw ?? []) as { categoria: string | null }[])
        .map((r) => r.categoria)
        .filter((c): c is string => !!c),
    ),
  ).sort();

  return (
    <>
      <PageHero
        eyebrow={tNav("infopoint")}
        title={tMod("infopoint.title")}
        subtitle={tMod("infopoint.subtitle")}
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
              param: "categoria",
              placeholder: tCommon("all"),
              options: cats.map((c) => ({ value: c, label: c })),
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
              categoria: string | null;
              immagini: string[];
            }>).map((a) => (
              <ListingCard
                key={a.id}
                href={`/infopoint/${a.id}`}
                title={a.nome}
                description={a.descrizione}
                imageUrl={a.immagini?.[0] ?? null}
                fallbackIcon={Landmark}
                meta={a.categoria ?? a.citta}
                topBadge={a.citta}
                cta={tMod("infopoint.view")}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
