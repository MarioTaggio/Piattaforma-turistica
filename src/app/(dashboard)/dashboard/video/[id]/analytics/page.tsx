import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BarChart3,
  ShoppingBag,
  Wallet,
  Users,
} from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  formatDate,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Analytics corso — Piattaforma Turistica",
};

type AcquistoRow = {
  id: string;
  prezzo_pagato_cents: number;
  created_at: string;
  utente_id: string;
  users: { nome: string | null; cognome: string | null; email: string } | null;
};

export default async function CorsoAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_video");
  const { id } = await params;
  const supabase = await createClient();

  const { data: corso } = await supabase
    .from("corsi")
    .select("titolo, gestore_id")
    .eq("id", id)
    .single();
  if (!corso) notFound();
  const c = corso as { titolo: string; gestore_id: string };
  if (c.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const { data } = await supabase
    .from("acquisti_video")
    .select(
      "id, prezzo_pagato_cents, created_at, utente_id, users ( nome, cognome, email )",
    )
    .eq("corso_id", id)
    .order("created_at", { ascending: false });

  const acquisti = (data ?? []) as unknown as AcquistoRow[];
  const revenue = acquisti.reduce(
    (s, a) => s + (a.prezzo_pagato_cents ?? 0),
    0,
  );

  // Average order value
  const aov = acquisti.length > 0 ? revenue / acquisti.length : 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Andamento vendite del corso &laquo;{c.titolo}&raquo;.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          variant="primary"
          label="Revenue totale"
          value={formatEurFromCents(revenue)}
          icon={Wallet}
        />
        <StatCard
          label="Acquisti"
          value={formatNumber(acquisti.length)}
          icon={ShoppingBag}
        />
        <StatCard
          label="Prezzo medio"
          value={formatEurFromCents(aov)}
          icon={Users}
          hint="Per acquisto"
        />
      </div>

      {acquisti.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="Nessun acquisto ancora"
          description="Quando qualcuno acquisterà il corso vedrai qui i dati."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Acquirente</th>
                  <th className="px-5 py-3 font-medium">Acquistato il</th>
                  <th className="px-5 py-3 text-right font-medium">Prezzo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {acquisti.map((a) => {
                  const fullName = [a.users?.nome, a.users?.cognome]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="font-medium">
                          {fullName || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.users?.email ?? ""}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDate(a.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium">
                        {formatEurFromCents(a.prezzo_pagato_cents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
