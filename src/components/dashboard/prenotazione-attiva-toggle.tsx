"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";

import { setPrenotazioneAttiva } from "@/lib/gestore/prenotazione-toggle";
import { cn } from "@/lib/utils";

type Tabella = "eventi" | "strutture" | "ristoranti";

type Props = {
  tabella: Tabella;
  id: string;
  initial: boolean;
};

const COPY: Record<
  Tabella,
  { onLabel: string; offLabel: string; description: string }
> = {
  eventi: {
    onLabel: "Vendita biglietti attiva",
    offLabel: "Vendita biglietti disattivata",
    description:
      "Quando attiva, sul sito pubblico viene mostrato il pulsante \"Acquista biglietto\". Quando disattivata, l'evento resta visibile come pura informazione.",
  },
  strutture: {
    onLabel: "Prenotazioni camere attive",
    offLabel: "Prenotazioni camere disattivate",
    description:
      "Quando attiva, sul sito pubblico vengono mostrati calendario e pulsante \"Prenota\". Quando disattivata, la struttura è solo informativa.",
  },
  ristoranti: {
    onLabel: "Prenotazione tavoli attiva",
    offLabel: "Prenotazione tavoli disattivata",
    description:
      "Quando attiva, sul sito pubblico viene mostrato il form di prenotazione del tavolo. Quando disattivata, il ristorante è solo informativo (il menu resta visibile).",
  },
};

export function PrenotazioneAttivaToggle({ tabella, id, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(initial);
  const copy = COPY[tabella];

  function onToggle() {
    const next = !value;
    setValue(next); // ottimistico
    startTransition(async () => {
      const r = await setPrenotazioneAttiva({ tabella, id, value: next });
      if (r.error) {
        setValue(!next); // rollback
        toast.error(r.error);
        return;
      }
      toast.success(next ? copy.onLabel : copy.offLabel);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-4 rounded-2xl border p-5 shadow-sm transition",
        value
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-border bg-card",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl",
            value
              ? "bg-emerald-100 text-emerald-700"
              : "bg-muted text-muted-foreground",
          )}
        >
          {value ? (
            <CheckCircle2 className="size-5" />
          ) : (
            <XCircle className="size-5" />
          )}
        </span>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {value ? copy.onLabel : copy.offLabel}
          </p>
          <p className="max-w-xl text-xs text-muted-foreground">
            {copy.description}
          </p>
        </div>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label="Attiva o disattiva prenotazioni"
        onClick={onToggle}
        disabled={pending}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition disabled:opacity-60",
        )}
        style={{ background: value ? "#1B4332" : "#cbd5e1" }}
      >
        <span
          aria-hidden
          className="inline-flex size-6 transform items-center justify-center rounded-full bg-white shadow transition"
          style={{ transform: value ? "translateX(22px)" : "translateX(2px)" }}
        >
          {pending && <Loader2 className="size-3 animate-spin text-foreground/60" />}
        </span>
      </button>
    </div>
  );
}
