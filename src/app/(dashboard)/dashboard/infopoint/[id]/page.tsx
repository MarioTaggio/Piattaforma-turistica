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
import { DeleteButton } from "../../eventi/_components/delete-button";
import { deleteAttrazione } from "@/lib/gestore/infopoint";

import { AttrazioneForm } from "../_components/attrazione-form";

export const metadata: Metadata = {
  title: "Dettaglio attrazione — Piattaforma Turistica",
};

export default async function AttrazioneDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_infopoint");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("attrazioni")
    .select("*")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const a = row as {
    id: string;
    gestore_id: string;
    nome: string;
    descrizione: string | null;
    indirizzo: string;
    citta: string;
    categoria: string | null;
    orari: { raw?: string };
    immagini: string[];
    stato: "bozza" | "pubblicato" | "archiviato";
  };
  if (a.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const { data: tourRow } = await supabase
    .from("tour_virtuali")
    .select("url_tour, gratuito")
    .eq("attrazione_id", id)
    .maybeSingle();
  const tour = tourRow as { url_tour: string; gratuito: boolean } | null;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Informazioni</CardTitle>
          <CardDescription>
            Dettagli pubblici dell&apos;attrazione e tour virtuale.
          </CardDescription>
        </div>
        <DeleteButton
          action={deleteAttrazione}
          id={a.id}
          redirectTo="/dashboard/infopoint"
          confirmText="Eliminare l'attrazione? Le visite e prenotazioni esistenti impediranno la cancellazione."
        />
      </CardHeader>
      <CardContent>
        <AttrazioneForm
          mode="edit"
          id={a.id}
          defaultValues={{
            nome: a.nome,
            descrizione: a.descrizione ?? "",
            indirizzo: a.indirizzo,
            citta: a.citta,
            categoria: a.categoria ?? "",
            orari: a.orari?.raw ?? "",
            immagini: a.immagini.join(", "),
            tour_url: tour?.url_tour ?? "",
            tour_gratuito: tour?.gratuito ?? true,
            stato: a.stato,
          }}
        />
      </CardContent>
    </Card>
  );
}
