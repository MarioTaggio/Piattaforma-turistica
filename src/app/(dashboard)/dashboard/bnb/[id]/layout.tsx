import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TabsNav } from "@/components/dashboard/tabs-nav";

export default async function StrutturaLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_bnb");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("strutture")
    .select("nome, gestore_id")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const s = row as { nome: string; gestore_id: string };
  if (s.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const [{ count: camereCount }, { count: prenCount }] = await Promise.all([
    supabase
      .from("camere")
      .select("*", { count: "exact", head: true })
      .eq("struttura_id", id),
    supabase
      .from("prenotazioni_bnb")
      .select("camere!inner(struttura_id)", { count: "exact", head: true })
      .eq("camere.struttura_id", id),
  ]);

  const base = `/dashboard/bnb/${id}`;

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/bnb"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna alle strutture
      </Link>

      <PageHeader
        title={s.nome}
        subtitle="Gestisci dettagli, camere e prenotazioni della struttura."
      />

      <TabsNav
        tabs={[
          { label: "Dettaglio", href: base, icon: "dettaglio", exact: true },
          {
            label: "Camere",
            href: `${base}/camere`,
            icon: "hotel",
            badge: camereCount ?? 0,
          },
          {
            label: "Prenotazioni",
            href: `${base}/prenotazioni`,
            icon: "prenotazioni",
            badge: prenCount ?? 0,
          },
          {
            label: "Calendario",
            href: `${base}/calendario`,
            icon: "calendario",
          },
          {
            label: "Recensioni",
            href: `${base}/recensioni`,
            icon: "recensioni",
          },
        ]}
      />

      {children}
    </div>
  );
}
