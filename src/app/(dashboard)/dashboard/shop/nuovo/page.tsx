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

import { ShopForm } from "../_components/shop-form";

export const metadata: Metadata = {
  title: "Nuovo shop — Piattaforma Turistica",
};

export default async function ShopNewPage() {
  await requireRole("gestore_shop");
  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/shop"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna agli shop
      </Link>

      <PageHeader title="Nuovo shop" subtitle="Definisci nome e dettagli del tuo shop." />

      <Card>
        <CardHeader>
          <CardTitle>Dettagli</CardTitle>
          <CardDescription>
            Le informazioni saranno visibili nella scheda pubblica dello shop.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShopForm
            mode="create"
            defaultValues={{
              nome: "",
              descrizione: "",
              citta: "",
              indirizzo: "",
              telefono: "",
              email: "",
              immagini: [],
              stato: "bozza",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
