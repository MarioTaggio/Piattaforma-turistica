import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TabsNav } from "@/components/dashboard/tabs-nav";

export default async function RistoranteLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_ristorante");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("ristoranti")
    .select("nome, gestore_id")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const r = row as { nome: string; gestore_id: string };
  if (r.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const [{ count: tavoliCount }, { count: menuCount }, { count: prenCount }] =
    await Promise.all([
      supabase
        .from("tavoli")
        .select("*", { count: "exact", head: true })
        .eq("ristorante_id", id),
      supabase
        .from("prodotti")
        .select("*", { count: "exact", head: true })
        .eq("ristorante_id", id),
      supabase
        .from("prenotazioni_tavolo")
        .select("tavoli!inner(ristorante_id)", { count: "exact", head: true })
        .eq("tavoli.ristorante_id", id),
    ]);

  const base = `/dashboard/ristoranti/${id}`;

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/ristoranti"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna ai ristoranti
      </Link>

      <PageHeader
        title={r.nome}
        subtitle="Gestisci dettagli, tavoli, menu e prenotazioni del ristorante."
      />

      <TabsNav
        tabs={[
          { label: "Dettaglio", href: base, icon: "dettaglio", exact: true },
          {
            label: "Tavoli",
            href: `${base}/tavoli`,
            icon: "tavoli",
            badge: tavoliCount ?? 0,
          },
          {
            label: "Menu",
            href: `${base}/menu`,
            icon: "menu",
            badge: menuCount ?? 0,
          },
          {
            label: "Prenotazioni",
            href: `${base}/prenotazioni`,
            icon: "prenotazioni",
            badge: prenCount ?? 0,
          },
          {
            label: "Agenda",
            href: `${base}/agenda`,
            icon: "agenda",
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
