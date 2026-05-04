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

import { CamereSection, type Camera } from "../../_components/camere-section";

export const metadata: Metadata = {
  title: "Camere — Piattaforma Turistica",
};

export default async function StrutturaCamerePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_bnb");
  const { id } = await params;
  const supabase = await createClient();

  const { data: own } = await supabase
    .from("strutture")
    .select("gestore_id")
    .eq("id", id)
    .single();
  if (!own) notFound();
  if (
    (own as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  const { data: camereRows } = await supabase
    .from("camere")
    .select("id, nome, descrizione, capacita, prezzo_notte_cents, disponibile")
    .eq("struttura_id", id)
    .order("nome", { ascending: true });

  const camere = (camereRows ?? []) as Camera[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione camere</CardTitle>
        <CardDescription>
          Aggiungi camere con capacità, prezzo a notte e disponibilità.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CamereSection strutturaId={id} camere={camere} />
      </CardContent>
    </Card>
  );
}
