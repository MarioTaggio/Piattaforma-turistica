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

import { CorsoForm } from "../_components/corso-form";

export const metadata: Metadata = {
  title: "Nuovo corso — Piattaforma Turistica",
};

export default async function NuovoCorsoPage() {
  await requireRole("gestore_video");
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/video"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna ai corsi
      </Link>

      <PageHeader
        title="Nuovo corso"
        subtitle="Crea il corso, poi aggiungi le lezioni video."
      />

      <Card>
        <CardHeader>
          <CardTitle>Dettagli corso</CardTitle>
          <CardDescription>
            Le informazioni che compaiono nel marketplace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CorsoForm
            mode="create"
            defaultValues={{
              titolo: "",
              descrizione: "",
              prezzo_cents: 0,
              immagine_copertina: "",
              livello: undefined,
              stato: "bozza",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
