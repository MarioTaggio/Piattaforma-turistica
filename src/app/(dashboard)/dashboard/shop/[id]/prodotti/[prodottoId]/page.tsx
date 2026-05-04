import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Eye, ExternalLink, ShoppingBag } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatEurFromCents } from "@/lib/utils/format";

import { EditProdottoForm } from "./_components/edit-prodotto-form";

export const metadata: Metadata = {
  title: "Modifica prodotto — Piattaforma Turistica",
};

export default async function ShopProdottoEditPage({
  params,
}: {
  params: Promise<{ id: string; prodottoId: string }>;
}) {
  const user = await requireRole("gestore_shop");
  const { id: shopId, prodottoId } = await params;
  const supabase = await createClient();

  const { data: shopRow } = await supabase
    .from("shops")
    .select("id, nome, gestore_id")
    .eq("id", shopId)
    .single();
  if (!shopRow) notFound();
  const shop = shopRow as { id: string; nome: string; gestore_id: string };
  if (shop.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const { data: prodottoRow } = await supabase
    .from("shop_prodotti")
    .select(
      "id, nome, descrizione, prezzo_cents, categoria, immagine_url, disponibile, shop_id",
    )
    .eq("id", prodottoId)
    .single();
  if (!prodottoRow) notFound();
  const p = prodottoRow as {
    id: string;
    nome: string;
    descrizione: string | null;
    prezzo_cents: number;
    categoria: string | null;
    immagine_url: string | null;
    disponibile: boolean;
    shop_id: string;
  };
  if (p.shop_id !== shopId) notFound();

  return (
    <div className="space-y-6">
      <Link
        href={`/dashboard/shop/${shopId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna allo shop &laquo;{shop.nome}&raquo;
      </Link>

      <PageHeader
        title={p.nome}
        subtitle="Modifica i dettagli del prodotto. Le modifiche sono visibili immediatamente nello shop pubblico."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl"
            render={
              <Link href={`/shop/${p.id}`} target="_blank" rel="noreferrer" />
            }
          >
            <ExternalLink className="mr-1.5 size-3.5" />
            Apri pagina pubblica
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Dettagli prodotto</CardTitle>
            <CardDescription>
              Nome, prezzo, categoria, descrizione e immagine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditProdottoForm
              shopId={shopId}
              prodottoId={prodottoId}
              defaultValues={{
                nome: p.nome,
                descrizione: p.descrizione ?? "",
                prezzo_cents: p.prezzo_cents,
                categoria: p.categoria ?? "",
                immagine_url: p.immagine_url ?? "",
                disponibile: p.disponibile,
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-24 lg:self-start">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="size-4" /> Anteprima pubblica
            </CardTitle>
            <CardDescription>
              Come appare il prodotto agli utenti sul sito.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="relative aspect-video bg-brand-50">
                {p.immagine_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.immagine_url}
                    alt={p.nome}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-brand-700/50">
                    <ShoppingBag className="size-12" />
                  </div>
                )}
                {!p.disponibile && (
                  <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-rose-700">
                    Non disponibile
                  </span>
                )}
              </div>
              <div className="space-y-2 p-4">
                {p.categoria && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">
                    {p.categoria}
                  </p>
                )}
                <h3 className="text-base font-semibold">{p.nome}</h3>
                {p.descrizione && (
                  <p className="line-clamp-3 text-xs text-muted-foreground">
                    {p.descrizione}
                  </p>
                )}
                <p className="pt-1 text-lg font-semibold">
                  {formatEurFromCents(p.prezzo_cents)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Venduto da{" "}
                  <span className="font-medium text-foreground">
                    {shop.nome}
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
