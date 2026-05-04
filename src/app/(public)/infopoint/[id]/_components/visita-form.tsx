"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { prenotaVisita } from "@/lib/public/actions";
import {
  formatDateTime,
  formatEurFromCents,
} from "@/lib/utils/format";

type Visita = {
  id: string;
  titolo: string;
  data_ora: string;
  prezzo_cents: number;
  posti_disponibili: number;
  lingua: string;
};

type Props = {
  attrazioneId: string;
  visite: Visita[];
};

export function VisitaForm({ attrazioneId, visite }: Props) {
  const router = useRouter();
  const [visitaId, setVisitaId] = useState(visite[0]?.id ?? "");
  const [partecipanti, setPartecipanti] = useState(2);
  const [pending, startTransition] = useTransition();

  const v = visite.find((x) => x.id === visitaId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!visitaId) return;
    if (v && partecipanti > v.posti_disponibili) {
      toast.error(`Solo ${v.posti_disponibili} posti disponibili`);
      return;
    }
    startTransition(async () => {
      const r = await prenotaVisita({ attrazioneId, visitaId, partecipanti });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.redirectTo) {
        if (r.success) toast.success("Visita prenotata");
        router.push(r.redirectTo);
      }
    });
  }

  if (visite.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nessuna visita guidata in programma. Torna a trovarci presto!
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Visita
        </label>
        <select
          value={visitaId}
          onChange={(e) => setVisitaId(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {visite.map((x) => (
            <option key={x.id} value={x.id}>
              {x.titolo} — {formatDateTime(x.data_ora)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Partecipanti
        </label>
        <input
          type="number"
          min={1}
          max={v?.posti_disponibili ?? 50}
          value={partecipanti}
          onChange={(e) => setPartecipanti(parseInt(e.target.value, 10) || 1)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      {v && (
        <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5">
          <span className="text-xs uppercase tracking-wider text-brand-700">
            Lingua: {v.lingua.toUpperCase()} · {v.posti_disponibili} posti rimasti
          </span>
          <span className="text-base font-semibold">
            {v.prezzo_cents === 0
              ? "Gratis"
              : formatEurFromCents(v.prezzo_cents * partecipanti)}
          </span>
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        size="lg"
        className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
      >
        {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        Prenota visita
      </Button>
    </form>
  );
}
