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

import { RistoranteForm } from "../_components/ristorante-form";

export const metadata: Metadata = {
  title: "Nuovo ristorante — Piattaforma Turistica",
};

export default async function NuovoRistorantePage() {
  await requireRole("gestore_ristorante");
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/ristoranti"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna ai ristoranti
      </Link>

      <PageHeader
        title="Nuovo ristorante"
        subtitle="Crea il ristorante, poi aggiungi tavoli e prodotti."
      />

      <Card>
        <CardHeader>
          <CardTitle>Dettagli ristorante</CardTitle>
          <CardDescription>
            Le informazioni che compaiono sulla scheda pubblica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RistoranteForm
            mode="create"
            defaultValues={{
              nome: "",
              descrizione: "",
              indirizzo: "",
              citta: "",
              telefono: "",
              email: "",
              tipo_cucina: "",
              orari: "",
              immagini: "",
              stato: "bozza",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
