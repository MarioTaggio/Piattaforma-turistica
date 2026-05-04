import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TabsNav } from "@/components/dashboard/tabs-nav";

export default async function EventoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_eventi");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("eventi")
    .select("titolo, gestore_id, posti_totali, posti_disponibili")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const e = row as {
    titolo: string;
    gestore_id: string;
    posti_totali: number;
    posti_disponibili: number;
  };
  if (e.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const venduti = e.posti_totali - e.posti_disponibili;
  const base = `/dashboard/eventi/${id}`;

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/eventi"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna agli eventi
      </Link>

      <PageHeader
        title={e.titolo}
        subtitle="Gestisci dettagli, biglietti e comunicazioni di questo evento."
      />

      <TabsNav
        tabs={[
          {
            label: "Dettaglio evento",
            href: base,
            icon: "dettaglio",
            exact: true,
          },
          {
            label: "Biglietti venduti",
            href: `${base}/prenotazioni`,
            icon: "biglietti",
            badge: venduti,
          },
          {
            label: "Scanner ingresso",
            href: `${base}/scanner`,
            icon: "scanner",
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
