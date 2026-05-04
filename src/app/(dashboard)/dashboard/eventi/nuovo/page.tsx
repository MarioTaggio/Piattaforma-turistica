import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/dashboard/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { EventoForm } from "../_components/evento-form";

export const metadata: Metadata = {
  title: "Nuovo evento — Piattaforma Turistica",
};

export default async function NuovoEventoPage() {
  await requireRole("gestore_eventi");

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/eventi"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna agli eventi
      </Link>

      <PageHeader
        title="Crea nuovo evento"
        subtitle="Compila i dettagli, salva come bozza o pubblica subito."
      />

      <Card>
        <CardHeader>
          <CardTitle>Dettagli evento</CardTitle>
          <CardDescription>
            Tutte le informazioni che i partecipanti vedranno sulla scheda
            pubblica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventoForm
            mode="create"
            defaultValues={{
              titolo: "",
              descrizione: "",
              luogo: "",
              citta: "",
              data_inizio: "",
              data_fine: "",
              prezzo_cents: 0,
              posti_totali: 50,
              immagine_url: "",
              stato: "bozza",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
