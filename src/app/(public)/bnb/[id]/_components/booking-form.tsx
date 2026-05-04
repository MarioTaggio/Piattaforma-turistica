"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { prenotaCamera } from "@/lib/public/actions";
import { formatEurFromCents } from "@/lib/utils/format";

type Camera = {
  id: string;
  nome: string;
  capacita: number;
  prezzo_notte_cents: number;
};

type Props = {
  strutturaId: string;
  camere: Camera[];
};

function nightsBetween(a: string, b: string) {
  if (!a || !b) return 0;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export function BnbBookingForm({ strutturaId, camere }: Props) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const [cameraId, setCameraId] = useState(camere[0]?.id ?? "");
  const [checkIn, setCheckIn] = useState(today);
  const [checkOut, setCheckOut] = useState(tomorrow);
  const [ospiti, setOspiti] = useState(2);
  const [pending, startTransition] = useTransition();

  const camera = camere.find((c) => c.id === cameraId);
  const nights = nightsBetween(checkIn, checkOut);
  const total = useMemo(
    () => (camera ? nights * camera.prezzo_notte_cents : 0),
    [camera, nights],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!cameraId) {
      toast.error("Seleziona una camera");
      return;
    }
    startTransition(async () => {
      const r = await prenotaCamera({
        cameraId,
        strutturaId,
        checkIn,
        checkOut,
        ospiti,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.redirectTo) {
        if (r.success) toast.success("Richiesta inviata");
        router.push(r.redirectTo);
      }
    });
  }

  if (camere.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Al momento non ci sono camere prenotabili.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Camera
        </label>
        <select
          value={cameraId}
          onChange={(e) => setCameraId(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {camere.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome} — {formatEurFromCents(c.prezzo_notte_cents)} / notte
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Check-in
          </label>
          <input
            type="date"
            value={checkIn}
            onChange={(e) => setCheckIn(e.target.value)}
            min={today}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Check-out
          </label>
          <input
            type="date"
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
            min={checkIn || today}
            className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Ospiti
        </label>
        <input
          type="number"
          min={1}
          max={camera?.capacita ?? 10}
          value={ospiti}
          onChange={(e) => setOspiti(parseInt(e.target.value, 10) || 1)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex items-center justify-between rounded-xl bg-brand-50 px-3 py-2.5">
        <span className="text-xs uppercase tracking-wider text-brand-700">
          {nights} {nights === 1 ? "notte" : "notti"}
        </span>
        <span className="text-base font-semibold text-foreground">
          {formatEurFromCents(total)}
        </span>
      </div>

      <Button
        type="submit"
        disabled={pending || nights === 0}
        size="lg"
        className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
      >
        {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        Richiedi prenotazione
      </Button>
      <p className="text-[11px] text-muted-foreground">
        La richiesta resta in attesa fino alla conferma del gestore.
      </p>
    </form>
  );
}
