"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Check, Loader2, X } from "lucide-react";
import { toast } from "sonner";

import {
  updatePrenotazioneBnbCamera,
  updatePrenotazioneBnbPagamento,
  updatePrenotazioneBnbStato,
} from "@/lib/gestore/bnb";
import { Button } from "@/components/ui/button";

type CameraOption = { id: string; nome: string };

type Props = {
  prenotazioneId: string;
  strutturaId: string;
  currentStato: string;
  currentPagamento: string;
  currentCameraId: string;
  cameraOptions: CameraOption[];
};

const PAGAMENTO_LABEL: Record<string, string> = {
  in_attesa: "In attesa",
  pagato: "Pagato",
  fallito: "Fallito",
  rimborsato: "Rimborsato",
};

export function PrenotazioneActions({
  prenotazioneId,
  strutturaId,
  currentStato,
  currentPagamento,
  currentCameraId,
  cameraOptions,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showCamera, setShowCamera] = useState(false);
  const [cameraId, setCameraId] = useState(currentCameraId);

  function update(stato: "confermata" | "cancellata" | "completata") {
    startTransition(async () => {
      const res = await updatePrenotazioneBnbStato(
        prenotazioneId,
        strutturaId,
        stato,
      );
      if (res.error) {
        toast.error(res.error);
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
      const res = await updatePrenotazioneBnbPagamento(
        prenotazioneId,
        strutturaId,
        stato,
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(`Pagamento: ${PAGAMENTO_LABEL[stato]}`);
      router.refresh();
    });
  }

  function changeCamera() {
    if (cameraId === currentCameraId) {
      setShowCamera(false);
      return;
    }
    startTransition(async () => {
      const res = await updatePrenotazioneBnbCamera(
        prenotazioneId,
        strutturaId,
        cameraId,
      );
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Camera aggiornata");
      setShowCamera(false);
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

      {showCamera ? (
        <div className="flex items-center gap-1.5">
          <select
            value={cameraId}
            disabled={pending}
            onChange={(e) => setCameraId(e.target.value)}
            className="rounded-lg border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {cameraOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            className="rounded-lg text-xs"
            onClick={changeCamera}
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
              setCameraId(currentCameraId);
              setShowCamera(false);
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
          onClick={() => setShowCamera(true)}
        >
          <ArrowRightLeft className="mr-1 size-3.5" />
          Cambia camera
        </Button>
      )}
    </div>
  );
}
