import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Store } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { formatEurFromCents } from "@/lib/utils/format";

import { AddToCartButton } from "../_components/add-to-cart";

export const metadata: Metadata = {
  title: "Prodotto — Piattaforma Turistica",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: prodotto } = await supabase
    .from("shop_prodotti")
    .select(
      "id, nome, descrizione, categoria, prezzo_cents, immagine_url, disponibile, shop_id, shops:shop_id(id, nome, citta, stato)",
    )
    .eq("id", id)
    .single();

  if (!prodotto) notFound();
  const p = prodotto as unknown as {
    id: string;
    nome: string;
    descrizione: string | null;
    categoria: string | null;
    prezzo_cents: number;
    immagine_url: string | null;
    disponibile: boolean;
    shop_id: string;
    shops: { id: string; nome: string; citta: string | null; stato: string } | null;
  };

  if (!p.disponibile || p.shops?.stato !== "pubblicato") notFound();

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/shop"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Torna allo shop
      </Link>

      <div className="mt-6 grid gap-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm md:grid-cols-2">
        <div className="relative aspect-square bg-brand-50 md:aspect-auto">
          {p.immagine_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.immagine_url} alt={p.nome} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center text-brand-700/50">
              <Store className="size-16" />
            </div>
          )}
          {p.categoria && (
            <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 shadow-sm">
              {p.categoria}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-5 p-6 sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            {p.shops?.nome ?? "Shop"}
            {p.shops?.citta ? ` · ${p.shops.citta}` : ""}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {p.nome}
          </h1>
          {p.descrizione && (
            <p className="whitespace-pre-line text-base text-foreground/80">
              {p.descrizione}
            </p>
          )}

          <div className="mt-auto space-y-3 rounded-2xl bg-muted/30 p-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                Prezzo
              </p>
              <p className="text-3xl font-semibold text-foreground">
                {formatEurFromCents(p.prezzo_cents)}
              </p>
            </div>
            <AddToCartButton
              variant="full"
              product={{
                id: p.id,
                nome: p.nome,
                prezzo_cents: p.prezzo_cents,
                immagine_url: p.immagine_url,
                shop_id: p.shop_id,
                shop_nome: p.shops?.nome ?? "Shop",
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Completa l&apos;ordine dal carrello — riceverai conferma dallo shop.
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}
