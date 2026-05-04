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

import { TavoliSection, type Tavolo } from "../../_components/tavoli-section";

export const metadata: Metadata = {
  title: "Tavoli — Piattaforma Turistica",
};

export default async function RistoranteTavoliPage({
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

  const { data: tavoliRows } = await supabase
    .from("tavoli")
    .select("id, numero, posti, posizione, attivo")
    .eq("ristorante_id", id)
    .order("numero", { ascending: true });

  const tavoli = (tavoliRows ?? []) as Tavolo[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione tavoli</CardTitle>
        <CardDescription>
          Configura i tavoli per accettare prenotazioni.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TavoliSection ristoranteId={id} tavoli={tavoli} />
      </CardContent>
    </Card>
  );
}
