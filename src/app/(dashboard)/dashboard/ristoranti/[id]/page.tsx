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
import { deleteRistorante } from "@/lib/gestore/ristoranti";
import { PrenotazioneAttivaToggle } from "@/components/dashboard/prenotazione-attiva-toggle";

import { RistoranteForm } from "../_components/ristorante-form";

export const metadata: Metadata = {
  title: "Dettaglio ristorante — Piattaforma Turistica",
};

export default async function RistoranteDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_ristorante");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("ristoranti")
    .select("*")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const r = row as {
    id: string;
    gestore_id: string;
    nome: string;
    descrizione: string | null;
    indirizzo: string;
    citta: string;
    telefono: string | null;
    email: string | null;
    tipo_cucina: string | null;
    orari: { raw?: string };
    immagini: string[];
    stato: "bozza" | "pubblicato" | "archiviato";
    prenotazione_attiva: boolean | null;
  };
  if (r.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  return (
    <div className="space-y-6">
      <PrenotazioneAttivaToggle
        tabella="ristoranti"
        id={r.id}
        initial={!!r.prenotazione_attiva}
      />
      <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Informazioni</CardTitle>
          <CardDescription>Dettagli pubblici del ristorante.</CardDescription>
        </div>
        <DeleteButton
          action={deleteRistorante}
          id={r.id}
          redirectTo="/dashboard/ristoranti"
          confirmText="Eliminare il ristorante? Le prenotazioni esistenti impediranno la cancellazione."
        />
      </CardHeader>
      <CardContent>
        <RistoranteForm
          mode="edit"
          id={r.id}
          defaultValues={{
            nome: r.nome,
            descrizione: r.descrizione ?? "",
            indirizzo: r.indirizzo,
            citta: r.citta,
            telefono: r.telefono ?? "",
            email: r.email ?? "",
            tipo_cucina: r.tipo_cucina ?? "",
            orari: r.orari?.raw ?? "",
            immagini: r.immagini.join(", "),
            stato: r.stato,
          }}
        />
      </CardContent>
    </Card>
    </div>
  );
}
