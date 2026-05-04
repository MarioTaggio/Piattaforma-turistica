import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";

import { ScannerClient } from "./_scanner-client";

export const metadata: Metadata = {
  title: "Scanner biglietti — Piattaforma Turistica",
};

export default async function EventoScannerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_eventi");
  const { id } = await params;
  const supabase = await createClient();

  const { data: ev } = await supabase
    .from("eventi")
    .select("titolo, gestore_id, data_inizio, luogo, citta")
    .eq("id", id)
    .single();
  if (!ev) notFound();
  const evento = ev as {
    titolo: string;
    gestore_id: string;
    data_inizio: string;
    luogo: string;
    citta: string | null;
  };
  if (evento.gestore_id !== user.id && !user.roles.includes("admin"))
    notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Scanner biglietti
        </h1>
        <p className="text-sm text-muted-foreground">
          {evento.titolo}
          {evento.luogo
            ? ` · ${evento.luogo}${evento.citta ? `, ${evento.citta}` : ""}`
            : ""}
        </p>
      </header>

      <ScannerClient eventoId={id} eventoTitolo={evento.titolo} />
    </div>
  );
}
