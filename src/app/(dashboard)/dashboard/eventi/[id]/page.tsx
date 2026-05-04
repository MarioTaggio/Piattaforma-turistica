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

import { EventoForm } from "../_components/evento-form";
import { DeleteButton } from "../_components/delete-button";
import { deleteEvento } from "@/lib/gestore/eventi";

export const metadata: Metadata = {
  title: "Dettaglio evento — Piattaforma Turistica",
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function EventoDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_eventi");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("eventi")
    .select("*")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const e = row as {
    id: string;
    gestore_id: string;
    titolo: string;
    descrizione: string | null;
    luogo: string;
    citta: string | null;
    data_inizio: string;
    data_fine: string;
    prezzo_cents: number;
    posti_totali: number;
    immagine_url: string | null;
    stato: "bozza" | "pubblicato" | "archiviato";
  };
  if (e.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Dettagli evento</CardTitle>
          <CardDescription>
            Le modifiche pubblicate sono immediatamente visibili al pubblico.
          </CardDescription>
        </div>
        <DeleteButton
          action={deleteEvento}
          id={e.id}
          redirectTo="/dashboard/eventi"
          confirmText="Eliminare definitivamente questo evento? I biglietti collegati impediranno la cancellazione."
        />
      </CardHeader>
      <CardContent>
        <EventoForm
          mode="edit"
          id={e.id}
          defaultValues={{
            titolo: e.titolo,
            descrizione: e.descrizione ?? "",
            luogo: e.luogo,
            citta: e.citta ?? "",
            data_inizio: toLocalInput(e.data_inizio),
            data_fine: toLocalInput(e.data_fine),
            prezzo_cents: e.prezzo_cents,
            posti_totali: e.posti_totali,
            immagine_url: e.immagine_url ?? "",
            stato: e.stato,
          }}
        />
      </CardContent>
    </Card>
  );
}
