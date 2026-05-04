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
  VisiteSection,
  type Visita,
} from "../../_components/visite-section";

export const metadata: Metadata = {
  title: "Visite guidate — Piattaforma Turistica",
};

export default async function AttrazioneVisitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_infopoint");
  const { id } = await params;
  const supabase = await createClient();

  const { data: own } = await supabase
    .from("attrazioni")
    .select("gestore_id")
    .eq("id", id)
    .single();
  if (!own) notFound();
  if (
    (own as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  const { data: visiteRows } = await supabase
    .from("visite_guidate")
    .select(
      "id, titolo, descrizione, data_ora, durata_minuti, posti_totali, posti_disponibili, prezzo_cents, lingua, stato",
    )
    .eq("attrazione_id", id)
    .order("data_ora", { ascending: false });

  const visite = (visiteRows ?? []) as Visita[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visite guidate</CardTitle>
        <CardDescription>
          Programma le visite con date, durata e posti disponibili.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VisiteSection attrazioneId={id} visite={visite} />
      </CardContent>
    </Card>
  );
}
