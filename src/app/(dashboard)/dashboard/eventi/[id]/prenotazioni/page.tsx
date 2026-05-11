import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, Ticket, Users, Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";

import { BigliettoActions } from "./_actions";
import { ComunicazioneButton } from "@/components/dashboard/comunicazione-button";

export const metadata: Metadata = {
  title: "Biglietti venduti — Piattaforma Turistica",
};

type BigliettoRow = {
  id: string;
  codice: string;
  stato: string;
  prezzo_pagato_cents: number;
  created_at: string;
  utente_id: string;
  utilizzato_at: string | null;
  users: { nome: string | null; cognome: string | null; email: string } | null;
};

export default async function EventoPrenotazioniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_eventi");
  const { id } = await params;
  const supabase = await createClient();
  const tPg = await getTranslations("prenotazioniGestore");
  const tTicket = await getTranslations("ticket");

  const { data: evento } = await supabase
    .from("eventi")
    .select("titolo, gestore_id, posti_totali, posti_disponibili")
    .eq("id", id)
    .single();

  if (!evento) notFound();
  const e = evento as {
    titolo: string;
    gestore_id: string;
    posti_totali: number;
    posti_disponibili: number;
  };
  if (e.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  const { data } = await supabase
    .from("biglietti")
    .select(
      "id, codice, stato, prezzo_pagato_cents, created_at, utente_id, utilizzato_at, users ( nome, cognome, email )",
    )
    .eq("evento_id", id)
    .order("created_at", { ascending: false });

  const biglietti = (data ?? []) as unknown as BigliettoRow[];
  const venduti = e.posti_totali - e.posti_disponibili;
  const revenue = biglietti.reduce(
    (sum, b) => sum + (b.prezzo_pagato_cents ?? 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {tPg("subtitle")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl"
          render={
            <a
              href={`/api/gestore/eventi/${id}/biglietti.csv`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <Download className="mr-1.5 size-3.5" />
          {tPg("exportCsv")}
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          variant="primary"
          label={tPg("columnAmount")}
          value={`${formatNumber(venduti)}/${formatNumber(e.posti_totali)}`}
          icon={Ticket}
        />
        <StatCard
          label={tPg("columnGuests")}
          value={formatNumber(biglietti.length)}
          icon={Users}
        />
        <StatCard
          label={tPg("columnAmount")}
          value={formatEurFromCents(revenue)}
          icon={Wallet}
        />
      </div>

      {biglietti.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title={tPg("noBookings")}
          description={tPg("subtitle")}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">{tPg("columnCustomer")}</th>
                  <th className="px-5 py-3 font-medium">{tTicket("code")}</th>
                  <th className="px-5 py-3 font-medium">{tPg("columnStatus")}</th>
                  <th className="px-5 py-3 font-medium">{tPg("columnDate")}</th>
                  <th className="px-5 py-3 text-right font-medium">{tPg("columnAmount")}</th>
                  <th className="px-5 py-3 text-right font-medium">{tPg("columnActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {biglietti.map((b) => {
                  const fullName = [b.users?.nome, b.users?.cognome]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={b.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="font-medium">
                          {fullName || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.users?.email ?? ""}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
                          {b.codice.slice(0, 8)}…
                        </code>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge kind="biglietto" value={b.stato} />
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {formatDateTime(b.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right font-medium">
                        {formatEurFromCents(b.prezzo_pagato_cents)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ComunicazioneButton
                            userId={b.utente_id}
                            modulo="Biglietto evento"
                            riferimento={`${e.titolo} — ${b.codice.slice(0, 8)}`}
                            link="/dashboard/biglietti"
                          />
                          <BigliettoActions
                            bigliettoId={b.id}
                            eventoId={id}
                            currentStato={b.stato}
                          />
                        </div>
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
