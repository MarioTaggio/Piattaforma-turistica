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
import { deleteCorso } from "@/lib/gestore/video";

import { CorsoForm } from "../_components/corso-form";

export const metadata: Metadata = {
  title: "Dettaglio corso — Piattaforma Turistica",
};

export default async function CorsoDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_video");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("corsi")
    .select("*")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const c = row as {
    id: string;
    gestore_id: string;
    titolo: string;
    descrizione: string | null;
    prezzo_cents: number;
    immagine_copertina: string | null;
    livello: "principiante" | "intermedio" | "avanzato" | null;
    stato: "bozza" | "pubblicato" | "archiviato";
  };
  if (c.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Dettagli corso</CardTitle>
          <CardDescription>
            Le informazioni visibili al pubblico.
          </CardDescription>
        </div>
        <DeleteButton
          action={deleteCorso}
          id={c.id}
          redirectTo="/dashboard/video"
          confirmText="Eliminare il corso? Gli acquisti esistenti impediranno la cancellazione."
        />
      </CardHeader>
      <CardContent>
        <CorsoForm
          mode="edit"
          id={c.id}
          defaultValues={{
            titolo: c.titolo,
            descrizione: c.descrizione ?? "",
            prezzo_cents: c.prezzo_cents,
            immagine_copertina: c.immagine_copertina ?? "",
            livello: c.livello ?? undefined,
            stato: c.stato,
          }}
        />
      </CardContent>
    </Card>
  );
}
