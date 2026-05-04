"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";

import { updatePrenotazioneTavoloStato } from "@/lib/gestore/ristoranti";
import { Button } from "@/components/ui/button";

type Props = {
  prenotazioneId: string;
  ristoranteId: string;
  currentStato: string;
};

export function PrenotazioneActions({
  prenotazioneId,
  ristoranteId,
  currentStato,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function update(stato: "confermata" | "cancellata") {
    startTransition(async () => {
      const r = await updatePrenotazioneTavoloStato(
        prenotazioneId,
        ristoranteId,
        stato,
      );
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(stato === "confermata" ? "Confermata" : "Annullata");
      router.refresh();
    });
  }

  if (currentStato !== "in_attesa") return null;

  return (
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
  );
}
