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

import { StrutturaForm } from "../_components/struttura-form";

export const metadata: Metadata = {
  title: "Nuova struttura — Piattaforma Turistica",
};

export default async function NuovaStrutturaPage() {
  await requireRole("gestore_bnb");

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/bnb"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna alle strutture
      </Link>

      <PageHeader
        title="Nuova struttura"
        subtitle="Inserisci i dettagli base. Aggiungerai le camere subito dopo."
      />

      <Card>
        <CardHeader>
          <CardTitle>Dettagli struttura</CardTitle>
          <CardDescription>
            Le informazioni visibili sulla scheda pubblica del B&B.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StrutturaForm
            mode="create"
            defaultValues={{
              nome: "",
              descrizione: "",
              indirizzo: "",
              citta: "",
              cap: "",
              stelle: undefined,
              servizi: "",
              immagini: "",
              stato: "bozza",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
