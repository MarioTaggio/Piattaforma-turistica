"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createManualPrenotazioneTavolo } from "@/lib/gestore/ristoranti";

type TavoloOption = { id: string; numero: string; posti: number };

type Props = {
  ristoranteId: string;
  tavoli: TavoloOption[];
};

export function ManualBookingButton({ ristoranteId, tavoli }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [tavoloId, setTavoloId] = useState(tavoli[0]?.id ?? "");
  const [dataOra, setDataOra] = useState("");
  const [numOspiti, setNumOspiti] = useState(2);
  const [nomeCliente, setNomeCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [note, setNote] = useState("");

  function reset() {
    setTavoloId(tavoli[0]?.id ?? "");
    setDataOra("");
    setNumOspiti(2);
    setNomeCliente("");
    setTelefonoCliente("");
    setNote("");
  }

  function submit() {
    startTransition(async () => {
      const r = await createManualPrenotazioneTavolo(ristoranteId, {
        tavoloId,
        dataOra,
        numOspiti,
        nomeCliente,
        telefonoCliente,
        note,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Prenotazione registrata");
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        className="rounded-xl bg-brand-600 hover:bg-brand-700"
        onClick={() => setOpen(true)}
        disabled={tavoli.length === 0}
        title={
          tavoli.length === 0
            ? "Aggiungi prima almeno un tavolo"
            : "Nuova prenotazione manuale"
        }
      >
        <Plus className="mr-1.5 size-3.5" />
        Nuova prenotazione
      </Button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          <div className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl">
            <header className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold">
                  Nuova prenotazione manuale
                </h3>
                <p className="text-xs text-muted-foreground">
                  Registra una prenotazione telefonica o walk-in. Bloccherà il
                  tavolo nell&apos;orario indicato.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Chiudi"
              >
                <X className="size-4" />
              </button>
            </header>

            <div className="grid gap-3 sm:grid-cols-2">
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
                <Label>Data e ora</Label>
                <Input
                  type="datetime-local"
                  value={dataOra}
                  onChange={(e) => setDataOra(e.target.value)}
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
              <div className="space-y-1.5">
                <Label>Nome cliente</Label>
                <Input
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  placeholder="Mario Rossi"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Telefono cliente (opzionale)</Label>
                <Input
                  value={telefonoCliente}
                  onChange={(e) => setTelefonoCliente(e.target.value)}
                  placeholder="333 1234567"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Note (opzionale)</Label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Allergie, occasione, richieste…"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Annulla
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={submit}
                disabled={pending}
                className="rounded-xl bg-brand-600 hover:bg-brand-700"
              >
                {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
                Registra
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
