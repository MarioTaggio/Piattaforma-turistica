import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  formatDate,
  formatDateTime,
  formatEurFromCents,
} from "@/lib/utils/format";

import { ComunicazioneButton } from "@/components/dashboard/comunicazione-button";

import { PrenotazioneEditDialog } from "./_edit-dialog";

export const metadata: Metadata = {
  title: "Prenotazioni visite — Piattaforma Turistica",
};

type PrenRow = {
  id: string;
  utente_id: string;
  num_partecipanti: number;
  prezzo_totale_cents: number;
  stato: string;
  stato_pagamento: string;
  created_at: string;
  visite_guidate: { titolo: string; data_ora: string } | null;
  users: {
    nome: string | null;
    cognome: string | null;
    email: string;
    telefono: string | null;
  } | null;
};

export default async function AttrazionePrenotazioniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_infopoint");
  const { id } = await params;
  const supabase = await createClient();

  const { data: attr } = await supabase
    .from("attrazioni")
    .select("gestore_id")
    .eq("id", id)
    .single();
  if (!attr) notFound();
  if (
    (attr as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  const { data } = await supabase
    .from("prenotazioni_visita")
    .select(
      `id, utente_id, num_partecipanti, prezzo_totale_cents, stato, stato_pagamento, created_at,
       visite_guidate!inner ( titolo, data_ora, attrazione_id ),
       users ( nome, cognome, email, telefono )`,
    )
    .eq("visite_guidate.attrazione_id", id)
    .order("created_at", { ascending: false });

  const prenotazioni = (data ?? []) as unknown as PrenRow[];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Gestisci le richieste per le visite guidate.
      </p>

      {prenotazioni.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nessuna prenotazione"
          description="Quando qualcuno prenoterà una visita la troverai qui."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Cliente</th>
                  <th className="px-5 py-3 font-medium">Visita</th>
                  <th className="px-5 py-3 font-medium">Partecipanti</th>
                  <th className="px-5 py-3 font-medium">Stato</th>
                  <th className="px-5 py-3 text-right font-medium">Totale</th>
                  <th className="px-5 py-3 text-right font-medium">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prenotazioni.map((p) => {
                  const fullName = [p.users?.nome, p.users?.cognome]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={p.id} className="align-top hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="font-medium">
                          {fullName || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.users?.email ?? "—"}
                        </div>
                        {p.users?.telefono && (
                          <div className="text-xs text-muted-foreground">
                            Tel: {p.users.telefono}
                          </div>
                        )}
                        <div className="mt-1 text-xs text-muted-foreground">
                          Prenotato il {formatDate(p.created_at)}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="font-medium">
                          {p.visite_guidate?.titolo ?? "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {p.visite_guidate
                            ? formatDateTime(p.visite_guidate.data_ora)
                            : ""}
                        </div>
                      </td>
                      <td className="px-5 py-3">{p.num_partecipanti}</td>
                      <td className="px-5 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <StatusBadge kind="prenotazione" value={p.stato} />
                          <StatusBadge
                            kind="pagamento"
                            value={p.stato_pagamento}
                          />
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right font-medium">
                        {formatEurFromCents(p.prezzo_totale_cents)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <PrenotazioneEditDialog
                            prenotazione={{
                              id: p.id,
                              utente_id: p.utente_id,
                              num_partecipanti: p.num_partecipanti,
                              stato: p.stato,
                              stato_pagamento: p.stato_pagamento,
                              visitaTitolo: p.visite_guidate?.titolo ?? null,
                            }}
                            attrazioneId={id}
                          />
                          <ComunicazioneButton
                            userId={p.utente_id}
                            modulo="Prenotazione visita"
                            riferimento={p.visite_guidate?.titolo ?? ""}
                            link="/dashboard/prenotazioni"
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
