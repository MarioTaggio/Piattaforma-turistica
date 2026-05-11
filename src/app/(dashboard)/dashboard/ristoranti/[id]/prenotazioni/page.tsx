import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { formatDateTime } from "@/lib/utils/format";

import { ManualBookingButton } from "./_manual-booking";
import { PrenotazioneEditDialog } from "./_edit-dialog";
import { ComunicazioneButton } from "@/components/dashboard/comunicazione-button";

export const metadata: Metadata = {
  title: "Prenotazioni tavoli — Piattaforma Turistica",
};

type RisRow = {
  id: string;
  utente_id: string | null;
  tavolo_id: string;
  data_ora: string;
  num_ospiti: number;
  note: string | null;
  stato: string;
  tavoli: { numero: string } | null;
  users: { nome: string | null; cognome: string | null; email: string } | null;
};

export default async function RistorantePrenotazioniPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("gestore_ristorante");
  const tPg = await getTranslations("prenotazioniGestore");
  const tBooking = await getTranslations("booking");
  const { id } = await params;
  const supabase = await createClient();

  const { data: rist } = await supabase
    .from("ristoranti")
    .select("gestore_id")
    .eq("id", id)
    .single();
  if (!rist) notFound();
  if (
    (rist as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  const { data } = await supabase
    .from("prenotazioni_tavolo")
    .select(
      `id, utente_id, tavolo_id, data_ora, num_ospiti, note, stato,
       tavoli!inner ( numero, ristorante_id ),
       users ( nome, cognome, email )`,
    )
    .eq("tavoli.ristorante_id", id)
    .order("data_ora", { ascending: false });

  const prenotazioni = (data ?? []) as unknown as RisRow[];

  // Lista tavoli per i selettori (manual booking + edit). Includiamo anche
  // quelli inattivi perché una prenotazione esistente potrebbe puntare a un
  // tavolo successivamente disattivato e va comunque mostrato/modificabile.
  const { data: tavRows } = await supabase
    .from("tavoli")
    .select("id, numero, posti")
    .eq("ristorante_id", id)
    .order("numero", { ascending: true });
  const tavoli = (tavRows ?? []) as {
    id: string;
    numero: string;
    posti: number;
  }[];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Conferma o rifiuta le prenotazioni in arrivo.
        </p>
        <ManualBookingButton ristoranteId={id} tavoli={tavoli} />
      </div>

      {prenotazioni.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={tPg("noBookings")}
          description="Quando un cliente prenoterà un tavolo apparirà qui."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">{tPg("columnCustomer")}</th>
                  <th className="px-5 py-3 font-medium">{tBooking("table")}</th>
                  <th className="px-5 py-3 font-medium">Quando</th>
                  <th className="px-5 py-3 font-medium">{tPg("columnStatus")}</th>
                  <th className="px-5 py-3 text-right font-medium">{tPg("columnActions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {prenotazioni.map((p) => {
                  const fullName = [p.users?.nome, p.users?.cognome]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <tr key={p.id} className="hover:bg-muted/30">
                      <td className="px-5 py-3">
                        <div className="font-medium">{fullName || "—"}</div>
                        <div className="text-xs text-muted-foreground">
                          {p.users?.email ?? ""}
                          {" · "}
                          {p.num_ospiti} ospite
                          {p.num_ospiti === 1 ? "" : "i"}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        Tavolo {p.tavoli?.numero ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {formatDateTime(p.data_ora)}
                        {p.note && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {p.note}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge kind="prenotazione" value={p.stato} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex flex-col items-end gap-2">
                          <PrenotazioneEditDialog
                            prenotazione={{
                              id: p.id,
                              utente_id: p.utente_id,
                              tavolo_id: p.tavolo_id,
                              data_ora: p.data_ora,
                              num_ospiti: p.num_ospiti,
                              note: p.note,
                              stato: p.stato,
                              tavoloNumero: p.tavoli?.numero ?? null,
                            }}
                            ristoranteId={id}
                            tavoli={tavoli}
                          />
                          {p.utente_id && (
                            <ComunicazioneButton
                              userId={p.utente_id}
                              modulo="Prenotazione tavolo"
                              riferimento={`Tavolo ${p.tavoli?.numero ?? ""} — ${formatDateTime(p.data_ora)}`}
                              link="/dashboard/prenotazioni"
                            />
                          )}
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
