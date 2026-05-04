"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

import {
  updatePrenotazioneVisitaPagamento,
  updatePrenotazioneVisitaPartecipanti,
  updatePrenotazioneVisitaStato,
} from "@/lib/gestore/infopoint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  prenotazioneId: string;
  attrazioneId: string;
  currentStato: string;
  currentPagamento: string;
  currentPartecipanti: number;
};

const PAGAMENTO_LABEL: Record<string, string> = {
  in_attesa: "In attesa",
  pagato: "Pagato",
  fallito: "Fallito",
  rimborsato: "Rimborsato",
};

export function PrenotazioneActions({
  prenotazioneId,
  attrazioneId,
  currentStato,
  currentPagamento,
  currentPartecipanti,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editingPart, setEditingPart] = useState(false);
  const [partecipanti, setPartecipanti] = useState(currentPartecipanti);

  function update(stato: "confermata" | "cancellata" | "completata") {
    startTransition(async () => {
      const r = await updatePrenotazioneVisitaStato(
        prenotazioneId,
        attrazioneId,
        stato,
      );
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(
        stato === "confermata"
          ? "Confermata"
          : stato === "cancellata"
            ? "Annullata"
            : "Completata",
      );
      router.refresh();
    });
  }

  function updatePag(stato: "in_attesa" | "pagato" | "fallito" | "rimborsato") {
    startTransition(async () => {
      const r = await updatePrenotazioneVisitaPagamento(
        prenotazioneId,
        attrazioneId,
        stato,
      );
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`Pagamento: ${PAGAMENTO_LABEL[stato]}`);
      router.refresh();
    });
  }

  function savePart() {
    if (partecipanti === currentPartecipanti) {
      setEditingPart(false);
      return;
    }
    startTransition(async () => {
      const r = await updatePrenotazioneVisitaPartecipanti(
        prenotazioneId,
        attrazioneId,
        partecipanti,
      );
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Partecipanti aggiornati");
      setEditingPart(false);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {currentStato === "in_attesa" && (
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            className="rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => update("confermata")}
          >
            <Check className="mr-1 size-3.5" />
            Conferma
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => update("cancellata")}
          >
            <X className="mr-1 size-3.5" />
            Rifiuta
          </Button>
        </div>
      )}
      {currentStato === "confermata" && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          className="rounded-lg text-xs"
          onClick={() => update("completata")}
        >
          Segna come completata
        </Button>
      )}

      <div className="flex items-center gap-1.5">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Pagamento
        </label>
        <select
          value={currentPagamento}
          disabled={pending}
          onChange={(e) =>
            updatePag(
              e.target.value as
                | "in_attesa"
                | "pagato"
                | "fallito"
                | "rimborsato",
            )
          }
          className="rounded-lg border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="in_attesa">In attesa</option>
          <option value="pagato">Pagato</option>
          <option value="fallito">Fallito</option>
          <option value="rimborsato">Rimborsato</option>
        </select>
      </div>

      {editingPart ? (
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            min={1}
            value={partecipanti}
            onChange={(e) => setPartecipanti(Number(e.target.value))}
            className="h-7 w-20 text-xs"
            disabled={pending}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            className="rounded-lg text-xs"
            onClick={savePart}
          >
            {pending && <Loader2 className="mr-1 size-3.5 animate-spin" />}
            Salva
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            className="rounded-lg text-xs"
            onClick={() => {
              setPartecipanti(currentPartecipanti);
              setEditingPart(false);
            }}
          >
            Annulla
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="rounded-lg text-xs"
          onClick={() => setEditingPart(true)}
        >
          <Pencil className="mr-1 size-3.5" />
          Modifica partecipanti
        </Button>
      )}
    </div>
  );
}
