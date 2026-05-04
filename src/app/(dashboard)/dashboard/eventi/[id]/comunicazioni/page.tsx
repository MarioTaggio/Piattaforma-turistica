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

export default async function EventoComunicazioniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_eventi");
  const { id } = await params;
  const supabase = await createClient();

  const { data: ev } = await supabase
    .from("eventi")
    .select("titolo, gestore_id")
    .eq("id", id)
    .single();
  if (!ev) notFound();
  const e = ev as { titolo: string; gestore_id: string };
  if (e.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const { count } = await supabase
    .from("biglietti")
    .select("*", { count: "exact", head: true })
    .eq("evento_id", id)
    .eq("stato", "valido");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="size-4" /> Email a tutti i partecipanti
        </CardTitle>
        <CardDescription>
          Invia un&apos;email a tutti i possessori di un biglietto valido per
          questo evento (es. promemoria, cambio location, info logistiche).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MassEmailForm eventoId={id} destinatari={count ?? 0} />
      </CardContent>
    </Card>
  );
}
