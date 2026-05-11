import type { Metadata } from "next";
import { PlayCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHero } from "@/components/public/page-hero";
import { FilterBar } from "@/components/public/filter-bar";
import { ListingCard } from "@/components/public/listing-card";
import { formatEurFromCents } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Video lezioni — Piattaforma Turistica",
};

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function PublicVideoPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tNav = await getTranslations("nav");
  const tMod = await getTranslations("modules");
  const tCommon = await getTranslations("common");
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const livello = (sp.livello as string | undefined) ?? "";
  const free = sp.gratis as string | undefined;

  const supabase = createAdminClient();
  let query = supabase
    .from("corsi")
    .select(
      "id, titolo, descrizione, livello, prezzo_cents, immagine_copertina, durata_totale_secondi",
    )
    .eq("stato", "pubblicato");

  if (q) query = query.ilike("titolo", `%${q.replace(/[%_]/g, "")}%`);
  if (livello) query = query.eq("livello", livello);
  if (free === "true") query = query.eq("prezzo_cents", 0);

  const { data } = await query
    .order("titolo", { ascending: true })
    .limit(48);

  return (
    <>
      <PageHero
        eyebrow={tNav("videolezioni")}
        title={tMod("video.title")}
        subtitle={tMod("video.subtitle")}
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <FilterBar
          fields={[
            { type: "search", param: "q", placeholder: tCommon("searchPlaceholder") },
            {
              type: "select",
              param: "livello",
              placeholder: tCommon("all"),
              options: [
                { value: "principiante", label: "Principiante" },
                { value: "intermedio", label: "Intermedio" },
                { value: "avanzato", label: "Avanzato" },
              ],
            },
            {
              type: "select",
              param: "gratis",
              placeholder: tCommon("free"),
              options: [{ value: "true", label: tCommon("free") }],
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
              titolo: string;
              descrizione: string | null;
              livello: string | null;
              prezzo_cents: number;
              immagine_copertina: string | null;
              durata_totale_secondi: number | null;
            }>).map((c) => (
              <ListingCard
                key={c.id}
                href={`/videolezioni/${c.id}`}
                title={c.titolo}
                description={c.descrizione}
                imageUrl={c.immagine_copertina}
                fallbackIcon={PlayCircle}
                meta={c.livello ?? tNav("videolezioni")}
                price={
                  c.prezzo_cents === 0
                    ? tCommon("free")
                    : formatEurFromCents(c.prezzo_cents)
                }
                cta={tMod("video.view")}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
