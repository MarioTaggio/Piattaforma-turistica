import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  formatDate,
  formatEurFromCents,
  nightsBetween,
} from "@/lib/utils/format";

import { ComunicazioneButton } from "@/components/dashboard/comunicazione-button";

import { PrenotazioneEditDialog } from "./_edit-dialog";

export const metadata: Metadata = {
  title: "Prenotazioni B&B — Piattaforma Turistica",
};

type PrenotazioneRow = {
  id: string;
  utente_id: string;
  camera_id: string;
  data_check_in: string;
  data_check_out: string;
  num_ospiti: number;
  prezzo_totale_cents: number;
  stato: string;
  stato_pagamento: string;
  note: string | null;
  created_at: string;
  camere: { nome: string } | null;
  users: {
    nome: string | null;
    cognome: string | null;
    email: string;
    telefono: string | null;
  } | null;
};

export default async function StrutturaPrenotazioniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_bnb");
  const { id } = await params;
  const supabase = await createClient();
  const tPg = await getTranslations("prenotazioniGestore");
  const tBooking = await getTranslations("booking");

  const { data: struttura } = await supabase
    .from("strutture")
    .select("gestore_id")
    .eq("id", id)
    .single();
  if (!struttura) notFound();
  if (
    (struttura as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  const { data } = await supabase
    .from("prenotazioni_bnb")
    .select(
      `id, utente_id, camera_id, data_check_in, data_check_out, num_ospiti, prezzo_totale_cents,
       stato, stato_pagamento, note, created_at,
       camere!inner ( nome, struttura_id ),
       users ( nome, cognome, email, telefono )`,
    )
    .eq("camere.struttura_id", id)
    .order("data_check_in", { ascending: false });

  const prenotazioni = (data ?? []) as unknown as PrenotazioneRow[];

  // Lista camere della struttura per il selettore "cambia camera"
  const { data: camRows } = await supabase
    .from("camere")
    .select("id, nome")
    .eq("struttura_id", id)
    .order("nome", { ascending: true });
  const cameraOptions = (camRows ?? []) as { id: string; nome: string }[];

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {tPg("subtitle")}
      </p>

      {prenotazioni.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
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
                  <th className="px-5 py-3 font-medium">{tBooking("room")}</th>
                  <th className="px-5 py-3 font-medium">{tPg("columnDate")}</th>
                  <th className="px-5 py-3 font-medium">{tPg("columnStatus")}</th>
                  <th className="px-5 py-3 text-right font-medium">{tPg("columnAmount")}</th>
                  <th className="px-5 py-3 text-right font-medium">{tPg("columnActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prenotazioni.map((p) => {
                  const fullName = [p.users?.nome, p.users?.cognome]
                    .filter(Boolean)
                    .join(" ");
                  const nights = nightsBetween(
                    p.data_check_in,
                    p.data_check_out,
                  );
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
                          {p.num_ospiti} ospite{p.num_ospiti === 1 ? "" : "i"}
                          {" · "}
                          Prenotato il {formatDate(p.created_at)}
                        </div>
                        {p.note && (
                          <p className="mt-1 rounded-md bg-muted/40 px-2 py-1 text-xs text-muted-foreground">
                            <span className="font-medium">Note:</span>{" "}
                            {p.note}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">{p.camere?.nome ?? "—"}</td>
                      <td className="px-5 py-3 text-xs">
                        {formatDate(p.data_check_in)} →{" "}
                        {formatDate(p.data_check_out)}
                        <div className="text-muted-foreground">
                          {nights} nott{nights === 1 ? "e" : "i"}
                        </div>
                      </td>
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
                              camera_id: p.camera_id,
                              data_check_in: p.data_check_in,
                              data_check_out: p.data_check_out,
                              num_ospiti: p.num_ospiti,
                              note: p.note,
                              stato: p.stato,
                              stato_pagamento: p.stato_pagamento,
                              cameraNome: p.camere?.nome ?? null,
                            }}
                            strutturaId={id}
                            cameraOptions={cameraOptions}
                          />
                          <ComunicazioneButton
                            userId={p.utente_id}
                            modulo="Prenotazione B&B"
                            riferimento={`${p.camere?.nome ?? ""} — ${formatDate(p.data_check_in)}`}
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
