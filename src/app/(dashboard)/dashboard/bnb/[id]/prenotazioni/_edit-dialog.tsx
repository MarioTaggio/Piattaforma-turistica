"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComunicazioneButton } from "@/components/dashboard/comunicazione-button";
import { updatePrenotazioneBnbFull } from "@/lib/gestore/bnb";

type StatoPrenotazione =
  | "in_attesa"
  | "confermata"
  | "cancellata"
  | "completata"
  | "no_show";

type StatoPagamento = "in_attesa" | "pagato" | "fallito" | "rimborsato";

type CameraOption = { id: string; nome: string };

export type Prenotazione = {
  id: string;
  utente_id: string;
  camera_id: string;
  data_check_in: string;
  data_check_out: string;
  num_ospiti: number;
  note: string | null;
  stato: string;
  stato_pagamento: string;
  cameraNome?: string | null;
};

type Props = {
  prenotazione: Prenotazione;
  strutturaId: string;
  cameraOptions: CameraOption[];
};

export function PrenotazioneEditDialog({
  prenotazione,
  strutturaId,
  cameraOptions,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-lg text-xs"
        onClick={() => setOpen(true)}
      >
        <Pencil className="mr-1 size-3.5" />
        Modifica
      </Button>
      {open && (
        <Modal
          prenotazione={prenotazione}
          strutturaId={strutturaId}
          cameraOptions={cameraOptions}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Modal({
  prenotazione,
  strutturaId,
  cameraOptions,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [stato, setStato] = useState<StatoPrenotazione>(
    prenotazione.stato as StatoPrenotazione,
  );
  const [statoPagamento, setStatoPagamento] = useState<StatoPagamento>(
    prenotazione.stato_pagamento as StatoPagamento,
  );
  const [cameraId, setCameraId] = useState(prenotazione.camera_id);
  const [dataCheckIn, setDataCheckIn] = useState(prenotazione.data_check_in);
  const [dataCheckOut, setDataCheckOut] = useState(prenotazione.data_check_out);
  const [numOspiti, setNumOspiti] = useState(prenotazione.num_ospiti);
  const [note, setNote] = useState(prenotazione.note ?? "");

  function save() {
    startTransition(async () => {
      const r = await updatePrenotazioneBnbFull(prenotazione.id, strutturaId, {
        stato,
        statoPagamento,
        cameraId,
        dataCheckIn,
        dataCheckOut,
        numOspiti,
        note,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Prenotazione aggiornata");
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-2xl space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">Modifica prenotazione</h3>
            <p className="text-xs text-muted-foreground">
              Modifica liberamente stato, pagamento e dettagli. Le modifiche
              sono immediate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Stato prenotazione</Label>
            <select
              value={stato}
              onChange={(e) => setStato(e.target.value as StatoPrenotazione)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="in_attesa">In attesa</option>
              <option value="confermata">Confermata</option>
              <option value="cancellata">Cancellata</option>
              <option value="completata">Completata</option>
              <option value="no_show">No show</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Stato pagamento</Label>
            <select
              value={statoPagamento}
              onChange={(e) =>
                setStatoPagamento(e.target.value as StatoPagamento)
              }
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="in_attesa">In attesa</option>
              <option value="pagato">Pagato</option>
              <option value="fallito">Fallito</option>
              <option value="rimborsato">Rimborsato</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Camera</Label>
            <select
              value={cameraId}
              onChange={(e) => setCameraId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {cameraOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Check-in</Label>
            <Input
              type="date"
              value={dataCheckIn}
              onChange={(e) => setDataCheckIn(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Check-out</Label>
            <Input
              type="date"
              value={dataCheckOut}
              onChange={(e) => setDataCheckOut(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Numero ospiti</Label>
            <Input
              type="number"
              min={1}
              value={numOspiti}
              onChange={(e) => setNumOspiti(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Note</Label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
          <ComunicazioneButton
            userId={prenotazione.utente_id}
            modulo="Prenotazione B&B"
            riferimento={
              prenotazione.cameraNome
                ? `${prenotazione.cameraNome} — ${prenotazione.data_check_in}`
                : prenotazione.data_check_in
            }
            link={`/dashboard/prenotazioni`}
            size="sm"
            label="Invia comunicazione"
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={pending}
            >
              Annulla
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={pending}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
              Salva modifiche
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
