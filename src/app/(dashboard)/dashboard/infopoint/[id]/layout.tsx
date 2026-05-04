import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TabsNav } from "@/components/dashboard/tabs-nav";

export default async function AttrazioneLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_infopoint");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("attrazioni")
    .select("nome, gestore_id")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const a = row as { nome: string; gestore_id: string };
  if (a.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const [{ count: visiteCount }, { count: prenCount }] = await Promise.all([
    supabase
      .from("visite_guidate")
      .select("*", { count: "exact", head: true })
      .eq("attrazione_id", id),
    supabase
      .from("prenotazioni_visita")
      .select("visite_guidate!inner(attrazione_id)", {
        count: "exact",
        head: true,
      })
      .eq("visite_guidate.attrazione_id", id),
  ]);

  const base = `/dashboard/infopoint/${id}`;

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/infopoint"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna alle attrazioni
      </Link>

      <PageHeader
        title={a.nome}
        subtitle="Gestisci dettagli, visite, prenotazioni e comunicazioni."
      />

      <TabsNav
        tabs={[
          { label: "Dettaglio", href: base, icon: "dettaglio", exact: true },
          {
            label: "Visite guidate",
            href: `${base}/visite`,
            icon: "visite",
            badge: visiteCount ?? 0,
          },
          {
            label: "Prenotazioni",
            href: `${base}/prenotazioni`,
            icon: "prenotazioni",
            badge: prenCount ?? 0,
          },
          {
            label: "Comunicazioni",
            href: `${base}/comunicazioni`,
            icon: "comunicazioni",
          },
        ]}
      />

      {children}
    </div>
  );
}
