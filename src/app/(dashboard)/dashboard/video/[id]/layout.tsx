import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { TabsNav } from "@/components/dashboard/tabs-nav";

export default async function CorsoLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_video");
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("corsi")
    .select("titolo, gestore_id")
    .eq("id", id)
    .single();
  if (!row) notFound();
  const c = row as { titolo: string; gestore_id: string };
  if (c.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const [{ count: lezCount }, { count: iscCount }] = await Promise.all([
    supabase
      .from("video_lezioni")
      .select("*", { count: "exact", head: true })
      .eq("corso_id", id),
    supabase
      .from("acquisti_video")
      .select("*", { count: "exact", head: true })
      .eq("corso_id", id),
  ]);

  const base = `/dashboard/video/${id}`;

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/video"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna ai corsi
      </Link>

      <PageHeader
        title={c.titolo}
        subtitle="Gestisci dettagli, lezioni, iscritti e analytics del corso."
      />

      <TabsNav
        tabs={[
          { label: "Dettaglio", href: base, icon: "dettaglio", exact: true },
          {
            label: "Lezioni",
            href: `${base}/lezioni`,
            icon: "lezioni",
            badge: lezCount ?? 0,
          },
          {
            label: "Iscritti",
            href: `${base}/iscritti`,
            icon: "iscritti",
            badge: iscCount ?? 0,
          },
          {
            label: "Analytics",
            href: `${base}/analytics`,
            icon: "analytics",
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
