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
  LezioniSection,
  type Lezione,
} from "../../_components/lezioni-section";

export const metadata: Metadata = {
  title: "Lezioni corso — Piattaforma Turistica",
};

export default async function CorsoLezioniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_video");
  const { id } = await params;
  const supabase = await createClient();

  const { data: own } = await supabase
    .from("corsi")
    .select("gestore_id")
    .eq("id", id)
    .single();
  if (!own) notFound();
  if (
    (own as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  const { data: lezRows } = await supabase
    .from("video_lezioni")
    .select(
      "id, titolo, descrizione, ordine, durata_secondi, anteprima_gratuita, video_url",
    )
    .eq("corso_id", id)
    .order("ordine", { ascending: true });
  const lezioni = (lezRows ?? []) as Lezione[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestione lezioni</CardTitle>
        <CardDescription>
          Carica i video, definisci l&apos;ordine di riproduzione e segna le
          anteprime gratuite.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LezioniSection corsoId={id} lezioni={lezioni} />
      </CardContent>
    </Card>
  );
}
