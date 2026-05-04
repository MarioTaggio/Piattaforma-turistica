"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCircle2,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  sendBigliettoReminder,
  updateBigliettoStato,
} from "@/lib/gestore/eventi";

type Props = {
  bigliettoId: string;
  eventoId: string;
  currentStato: string;
};

export function BigliettoActions({
  bigliettoId,
  eventoId,
  currentStato,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(stato: "utilizzato" | "rimborsato" | "annullato") {
    if (stato !== "utilizzato") {
      const conferma =
        stato === "rimborsato"
          ? "Confermare il rimborso? Il posto verrà restituito alla disponibilità."
          : "Annullare il biglietto? Il posto verrà restituito alla disponibilità.";
      if (!confirm(conferma)) return;
    }
    startTransition(async () => {
      const r = await updateBigliettoStato(bigliettoId, eventoId, stato);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Biglietto aggiornato");
      router.refresh();
    });
  }

  function reminder() {
    startTransition(async () => {
      const r = await sendBigliettoReminder(bigliettoId, eventoId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Reminder inviato");
    });
  }

  if (currentStato === "annullato" || currentStato === "rimborsato") {
    return (
      <span className="text-xs text-muted-foreground">Chiuso</span>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {currentStato === "valido" && (
        <>
          <Button
            type="button"
            size="sm"
            className="h-7 rounded-lg bg-emerald-600 text-xs hover:bg-emerald-700"
            onClick={() => update("utilizzato")}
            disabled={pending}
          >
            <CheckCircle2 className="mr-1 size-3" />
            Valida
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 rounded-lg text-xs"
            onClick={reminder}
            disabled={pending}
            title="Invia email reminder"
          >
            <Bell className="size-3.5" />
          </Button>
        </>
      )}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 rounded-lg text-xs"
        onClick={() => update("rimborsato")}
        disabled={pending}
        title="Rimborsa"
      >
        <RotateCcw className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => update("annullato")}
        disabled={pending}
        title="Annulla"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <XCircle className="size-3.5" />
        )}
      </Button>
    </div>
  );
}
