import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Mail } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { MassEmailForm } from "./_components/mass-email-form";

export const metadata: Metadata = {
  title: "Comunicazioni — Piattaforma Turistica",
};

export default async function AttrazioneComunicazioniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_infopoint");
  const { id } = await params;
  const supabase = await createClient();

  const { data: attr } = await supabase
    .from("attrazioni")
    .select("gestore_id")
    .eq("id", id)
    .single();
  if (!attr) notFound();
  if (
    (attr as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  // Conta visitatori unici prenotati per questa attrazione
  const { data: rows } = await supabase
    .from("prenotazioni_visita")
    .select(
      "utente_id, visite_guidate:visita_id!inner ( attrazione_id )",
    )
    .eq("visite_guidate.attrazione_id", id)
    .neq("stato", "cancellata");
  const unique = new Set(
    ((rows ?? []) as { utente_id: string }[]).map((r) => r.utente_id),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4" /> Email a tutti i visitatori
        </CardTitle>
        <CardDescription>
          Invia un&apos;email a tutti gli utenti con almeno una prenotazione
          attiva su una visita guidata di questa attrazione.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MassEmailForm attrazioneId={id} destinatari={unique.size} />
      </CardContent>
    </Card>
  );
}
