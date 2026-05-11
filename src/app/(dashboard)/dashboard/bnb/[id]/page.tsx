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
import { deleteStruttura } from "@/lib/gestore/bnb";
import { PrenotazioneAttivaToggle } from "@/components/dashboard/prenotazione-attiva-toggle";

import { StrutturaForm } from "../_components/struttura-form";

export const metadata: Metadata = {
  title: "Dettaglio struttura — Piattaforma Turistica",
};

export default async function StrutturaDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_bnb");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("strutture")
    .select("*")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const s = row as {
    id: string;
    gestore_id: string;
    nome: string;
    descrizione: string | null;
    indirizzo: string;
    citta: string;
    cap: string | null;
    servizi: string[];
    immagini: string[];
    stato: "bozza" | "pubblicato" | "archiviato";
    prenotazione_attiva: boolean | null;
  };
  if (s.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  return (
    <div className="space-y-6">
      <PrenotazioneAttivaToggle
        tabella="strutture"
        id={s.id}
        initial={!!s.prenotazione_attiva}
      />
      <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Informazioni</CardTitle>
          <CardDescription>
            Dettagli pubblici della struttura.
          </CardDescription>
        </div>
        <DeleteButton
          action={deleteStruttura}
          id={s.id}
          redirectTo="/dashboard/bnb"
          confirmText="Eliminare la struttura? Le prenotazioni esistenti impediranno la cancellazione."
        />
      </CardHeader>
      <CardContent>
        <StrutturaForm
          mode="edit"
          id={s.id}
          defaultValues={{
            nome: s.nome,
            descrizione: s.descrizione ?? "",
            indirizzo: s.indirizzo,
            citta: s.citta,
            cap: s.cap ?? "",
            servizi: s.servizi.join(", "),
            immagini: s.immagini.join(", "),
            stato: s.stato,
          }}
        />
      </CardContent>
    </Card>
    </div>
  );
}
