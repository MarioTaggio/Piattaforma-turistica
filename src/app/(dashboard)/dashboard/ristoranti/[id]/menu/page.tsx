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
  ProdottiSection,
  type Prodotto,
} from "../../_components/prodotti-section";

export const metadata: Metadata = {
  title: "Menu — Piattaforma Turistica",
};

export default async function RistoranteMenuPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_ristorante");
  const { id } = await params;
  const supabase = await createClient();

  const { data: own } = await supabase
    .from("ristoranti")
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
    .from("prodotti")
    .select("id, nome, descrizione, categoria, prezzo_cents, immagine_url")
    .eq("ristorante_id", id)
    .order("categoria", { ascending: true });

  const prodotti = (prodottiRows ?? []) as Prodotto[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Menu del ristorante</CardTitle>
        <CardDescription>
          Le voci pubblicate qui appaiono nella scheda pubblica come menu del
          ristorante.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProdottiSection ristoranteId={id} prodotti={prodotti} />
      </CardContent>
    </Card>
  );
}
