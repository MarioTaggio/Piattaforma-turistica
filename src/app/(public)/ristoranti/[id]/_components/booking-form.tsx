"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { prenotaTavolo } from "@/lib/public/actions";

type Tavolo = {
  id: string;
  numero: string;
  posti: number;
  posizione: string | null;
};

type Props = {
  ristoranteId: string;
  tavoli: Tavolo[];
};

export function TavoloBookingForm({ ristoranteId, tavoli }: Props) {
  const router = useRouter();
  const tBooking = useTranslations("booking");
  const tMessages = useTranslations("messages");
  const tMod = useTranslations("modules");

  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(20, 0, 0, 0);
    // produce YYYY-MM-DDTHH:mm
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const [tavoloId, setTavoloId] = useState(tavoli[0]?.id ?? "");
  const [dataOra, setDataOra] = useState(defaultDate);
  const [ospiti, setOspiti] = useState(2);
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const tavolo = tavoli.find((t) => t.id === tavoloId);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tavoloId) {
      toast.error(tMessages("genericError"));
      return;
    }
    if (tavolo && ospiti > tavolo.posti) {
      toast.error(`${tBooking("table")}: ${tavolo.posti}`);
      return;
    }
    startTransition(async () => {
      const r = await prenotaTavolo({
        ristoranteId,
        tavoloId,
        dataOra,
        ospiti,
        note: note.trim() || undefined,
      });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      if (r.redirectTo) {
        if (r.success) toast.success(tMessages("bookingSuccess"));
        router.push(r.redirectTo);
      }
    });
  }

  if (tavoli.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {tBooking("noTablesAvailable")}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tBooking("table")}
        </label>
        <select
          value={tavoloId}
          onChange={(e) => setTavoloId(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {tavoli.map((t) => (
            <option key={t.id} value={t.id}>
              {tBooking("table")} {t.numero} — {t.posti}
              {t.posizione ? ` · ${t.posizione}` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tBooking("date")}
        </label>
        <input
          type="datetime-local"
          value={dataOra}
          onChange={(e) => setDataOra(e.target.value)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tBooking("guests")}
        </label>
        <input
          type="number"
          min={1}
          max={tavolo?.posti ?? 12}
          value={ospiti}
          onChange={(e) => setOspiti(parseInt(e.target.value, 10) || 1)}
          className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {tBooking("notes")}
        </label>
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <Button
        type="submit"
        disabled={pending}
        size="lg"
        className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
      >
        {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        {tMod("ristoranti.book")}
      </Button>
    </form>
  );
}
