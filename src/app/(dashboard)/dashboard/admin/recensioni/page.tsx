import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { RecensioniTable } from "@/components/recensioni/recensioni-table";
import { RecensioniFilterTabs } from "@/components/recensioni/recensioni-filter-tabs";
import { StarRating } from "@/components/recensioni/star-rating";
import type { PublicRecensione } from "@/lib/recensioni/queries";
import type { StatoRecensione } from "@/types/database";

type Stato = StatoRecensione | "tutte";

export const metadata: Metadata = {
  title: "Recensioni — Admin",
};

export default async function AdminRecensioniPage({
  searchParams,
}: {
  searchParams: Promise<{ stato?: string }>;
}) {
  await requireRole("admin");
  const sp = await searchParams;
  const stato: Stato =
    sp.stato === "in_attesa" ||
    sp.stato === "approvata" ||
    sp.stato === "rifiutata"
      ? (sp.stato as Stato)
      : "tutte";

  const admin = createAdminClient();
  const baseSelect = `id, user_id, voto, titolo, testo, stato,
       risposta_gestore, risposta_data, motivazione_rifiuto, created_at,
       user:user_id (nome, cognome, avatar_url)`;

  let q = admin
    .from("recensioni")
    .select(baseSelect)
    .order("created_at", { ascending: false });
  if (stato !== "tutte") q = q.eq("stato", stato);
  const { data } = await q;
  const recensioni = ((data ?? []) as unknown) as PublicRecensione[];

  // Stats globali.
  const { data: allRows } = await admin
    .from("recensioni")
    .select("stato, voto");
  const all = (allRows ?? []) as { stato: string; voto: number }[];
  const counts = {
    in_attesa: all.filter((r) => r.stato === "in_attesa").length,
    approvata: all.filter((r) => r.stato === "approvata").length,
    rifiutata: all.filter((r) => r.stato === "rifiutata").length,
  };
  const approved = all.filter((r) => r.stato === "approvata");
  const avg =
    approved.length === 0
      ? 0
      : Math.round(
          (approved.reduce((s, r) => s + r.voto, 0) / approved.length) * 10,
        ) / 10;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recensioni"
        subtitle={`${all.length} totali · ${counts.approvata} approvate · ${counts.in_attesa} in attesa`}
      />

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Totale" value={String(all.length)} />
        <Stat label="In attesa" value={String(counts.in_attesa)} />
        <Stat label="Approvate" value={String(counts.approvata)} />
        <Stat
          label="Media voto"
          value={approved.length === 0 ? "—" : String(avg)}
          icon={
            approved.length > 0 ? <StarRating value={avg} size="sm" /> : null
          }
        />
      </div>

      <RecensioniFilterTabs
        basePath="/dashboard/admin/recensioni"
        active={stato}
        counts={counts}
      />

      <RecensioniTable recensioni={recensioni} />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-2xl font-semibold">{value}</p>
        {icon}
      </div>
    </div>
  );
}
