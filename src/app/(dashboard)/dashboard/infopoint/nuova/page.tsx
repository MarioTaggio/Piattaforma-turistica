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

import { AttrazioneForm } from "../_components/attrazione-form";

export const metadata: Metadata = {
  title: "Nuova attrazione — Piattaforma Turistica",
};

export default async function NuovaAttrazionePage() {
  await requireRole("gestore_infopoint");
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/infopoint"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna alle attrazioni
      </Link>

      <PageHeader
        title="Nuova attrazione"
        subtitle="Crea l'attrazione e collega un tour virtuale opzionale."
      />

      <Card>
        <CardHeader>
          <CardTitle>Dettagli attrazione</CardTitle>
          <CardDescription>
            Le informazioni che compaiono sulla scheda pubblica.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttrazioneForm
            mode="create"
            defaultValues={{
              nome: "",
              descrizione: "",
              indirizzo: "",
              citta: "",
              categoria: "",
              orari: "",
              immagini: [],
              tour_url: "",
              tour_gratuito: true,
              stato: "bozza",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
