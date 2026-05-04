import type { Metadata } from "next";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHero } from "@/components/public/page-hero";
import { FilterBar } from "@/components/public/filter-bar";

import { ProductCard } from "./_components/product-card";

export const metadata: Metadata = {
  title: "Shop — Piattaforma Turistica",
};

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const categoria = (sp.categoria as string | undefined)?.trim() ?? "";
  const shop = (sp.shop as string | undefined)?.trim() ?? "";
  const prezzoMax = (sp.prezzoMax as string | undefined) ?? "";

  const supabase = createAdminClient();
  let query = supabase
    .from("shop_prodotti")
    .select(
      "id, nome, descrizione, categoria, prezzo_cents, immagine_url, shop_id, shops:shop_id(id, nome, stato)",
    )
    .eq("disponibile", true);

  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`nome.ilike.${like},descrizione.ilike.${like}`);
  }
  if (categoria)
    query = query.ilike("categoria", `%${categoria.replace(/[%_]/g, "")}%`);
  if (shop) query = query.eq("shop_id", shop);
  if (prezzoMax) {
    const cents = Math.max(0, Math.round(Number(prezzoMax) * 100));
    if (Number.isFinite(cents)) query = query.lte("prezzo_cents", cents);
  }

  const { data } = await query.order("nome", { ascending: true }).limit(48);

  const visible = ((data ?? []) as unknown as Array<{
    id: string;
    nome: string;
    descrizione: string | null;
    categoria: string | null;
    prezzo_cents: number;
    immagine_url: string | null;
    shop_id: string;
    shops: { id: string; nome: string; stato: string } | null;
  }>).filter((p) => p.shops?.stato === "pubblicato");

  // Filter options
  const { data: optsRaw } = await supabase
    .from("shop_prodotti")
    .select("categoria, shops:shop_id(id, nome, stato)")
    .eq("disponibile", true);

  const opts = (optsRaw ?? []) as unknown as Array<{
    categoria: string | null;
    shops: { id: string; nome: string; stato: string } | null;
  }>;

  const categorie = Array.from(
    new Set(
      opts.map((o) => o.categoria).filter((c): c is string => !!c),
    ),
  ).sort();

  const shopOpts = Array.from(
    new Map(
      opts
        .filter((o) => o.shops && o.shops.stato === "pubblicato")
        .map((o) => [o.shops!.id, o.shops!.nome]),
    ).entries(),
  )
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <>
      <PageHero
        eyebrow="Shop"
        title="Prodotti tipici e specialità"
        subtitle="Acquista direttamente dagli shop dei nostri partner del territorio."
      />

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <FilterBar
          fields={[
            { type: "search", param: "q", placeholder: "Cerca prodotto…" },
            {
              type: "select",
              param: "categoria",
              placeholder: "Tutte le categorie",
              options: categorie.map((c) => ({ value: c, label: c })),
            },
            {
              type: "select",
              param: "shop",
              placeholder: "Tutti gli shop",
              options: shopOpts,
            },
            {
              type: "number",
              param: "prezzoMax",
              placeholder: "Prezzo max (€)",
              min: 0,
            },
          ]}
        />

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-16 text-center text-sm text-muted-foreground">
            Nessun prodotto trovato.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((p) => (
              <ProductCard
                key={p.id}
                product={{
                  id: p.id,
                  nome: p.nome,
                  descrizione: p.descrizione,
                  prezzo_cents: p.prezzo_cents,
                  categoria: p.categoria,
                  immagine_url: p.immagine_url,
                  shop_id: p.shop_id,
                  shop_nome: p.shops?.nome ?? "Shop",
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
