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

import { ShopForm } from "../_components/shop-form";

export const metadata: Metadata = {
  title: "Dettaglio shop — Piattaforma Turistica",
};

export default async function ShopDettaglioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_shop");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("shops")
    .select("*")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const s = row as {
    id: string;
    gestore_id: string;
    nome: string;
    descrizione: string | null;
    citta: string | null;
    indirizzo: string | null;
    telefono: string | null;
    email: string | null;
    immagini: string[];
    stato: "bozza" | "pubblicato" | "archiviato";
  };
  if (s.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informazioni</CardTitle>
        <CardDescription>Dettagli pubblici dello shop.</CardDescription>
      </CardHeader>
      <CardContent>
        <ShopForm
          mode="edit"
          id={s.id}
          defaultValues={{
            nome: s.nome,
            descrizione: s.descrizione ?? "",
            citta: s.citta ?? "",
            indirizzo: s.indirizzo ?? "",
            telefono: s.telefono ?? "",
            email: s.email ?? "",
            immagini: s.immagini.join(", "),
            stato: s.stato,
          }}
        />
      </CardContent>
    </Card>
  );
}
