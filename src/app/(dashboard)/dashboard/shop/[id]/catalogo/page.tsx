import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  ShopProdottiSection,
  type ShopProdotto,
} from "../../_components/shop-prodotti-section";

export const metadata: Metadata = {
  title: "Catalogo shop — Piattaforma Turistica",
};

export default async function ShopCatalogoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_shop");
  const { id } = await params;
  const supabase = await createClient();

  const { data: own } = await supabase
    .from("shops")
    .select("gestore_id")
    .eq("id", id)
    .single();
  if (!own) notFound();
  if (
    (own as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  const { data: prodottiRows } = await supabase
    .from("shop_prodotti")
    .select("id, nome, categoria, prezzo_cents, immagine_url, disponibile")
    .eq("shop_id", id)
    .order("categoria", { ascending: true });

  const prodotti = (prodottiRows ?? []) as ShopProdotto[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Catalogo prodotti</CardTitle>
        <CardDescription>
          I prodotti pubblicati appaiono nello shop pubblico e possono essere
          ordinati dai clienti. Clicca su un prodotto per modificarlo o
          gestirne stock e disponibilità.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ShopProdottiSection shopId={id} prodotti={prodotti} />
      </CardContent>
    </Card>
  );
}
