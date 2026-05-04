"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ComunicazioneButton } from "@/components/dashboard/comunicazione-button";
import { updatePrenotazioneTavoloFull } from "@/lib/gestore/ristoranti";

type StatoPrenotazione =
  | "in_attesa"
  | "confermata"
  | "cancellata"
  | "completata"
  | "no_show";

type TavoloOption = { id: string; numero: string; posti: number };

export type Prenotazione = {
  id: string;
  utente_id: string | null;
  tavolo_id: string;
  data_ora: string;
  num_ospiti: number;
  note: string | null;
  stato: string;
  tavoloNumero?: string | null;
};

type Props = {
  prenotazione: Prenotazione;
  ristoranteId: string;
  tavoli: TavoloOption[];
};

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PrenotazioneEditDialog({
  prenotazione,
  ristoranteId,
  tavoli,
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
          ristoranteId={ristoranteId}
          tavoli={tavoli}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Modal({
  prenotazione,
  ristoranteId,
  tavoli,
  onClose,
}: Props & { onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [stato, setStato] = useState<StatoPrenotazione>(
    prenotazione.stato as StatoPrenotazione,
  );
  const [tavoloId, setTavoloId] = useState(prenotazione.tavolo_id);
  const [dataOra, setDataOra] = useState(toLocalInput(prenotazione.data_ora));
  const [numOspiti, setNumOspiti] = useState(prenotazione.num_ospiti);
  const [note, setNote] = useState(prenotazione.note ?? "");

  function save() {
    startTransition(async () => {
      const r = await updatePrenotazioneTavoloFull(
        prenotazione.id,
        ristoranteId,
        {
          stato,
          tavoloId,
          dataOra,
          numOspiti,
          note,
        },
      );
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
              Modifica liberamente stato e dettagli. Le modifiche sono immediate.
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
          <div className="space-y-1.5 sm:col-span-2">
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
            <Label>Tavolo</Label>
            <select
              value={tavoloId}
              onChange={(e) => setTavoloId(e.target.value)}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {tavoli.map((t) => (
                <option key={t.id} value={t.id}>
                  Tavolo {t.numero} ({t.posti} posti)
                </option>
              ))}
            </select>
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
            <Label>Data e ora</Label>
            <Input
              type="datetime-local"
              value={dataOra}
              onChange={(e) => setDataOra(e.target.value)}
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
          {prenotazione.utente_id ? (
            <ComunicazioneButton
              userId={prenotazione.utente_id}
              modulo="Prenotazione tavolo"
              riferimento={
                prenotazione.tavoloNumero
                  ? `Tavolo ${prenotazione.tavoloNumero}`
                  : undefined
              }
              link="/dashboard/prenotazioni"
              size="sm"
              label="Invia comunicazione"
            />
          ) : (
            <span className="text-xs text-muted-foreground">
              Prenotazione walk-in: nessun cliente registrato a cui scrivere.
            </span>
          )}
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
