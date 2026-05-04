"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateTavolo } from "@/lib/gestore/ristoranti";
import {
  tavoloSchema,
  type TavoloInput,
} from "@/lib/gestore/ristoranti-schemas";

import type { Tavolo } from "./tavoli-section";

type Props = {
  tavolo: Tavolo;
  ristoranteId: string;
};

export function TavoloEditDialog({ tavolo, ristoranteId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-lg p-0"
        onClick={() => setOpen(true)}
        title="Modifica tavolo"
      >
        <Pencil className="size-3.5" />
      </Button>
      {open && (
        <Modal tavolo={tavolo} ristoranteId={ristoranteId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function Modal({
  tavolo,
  ristoranteId,
  onClose,
}: {
  tavolo: Tavolo;
  ristoranteId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof tavoloSchema>, unknown, TavoloInput>({
    resolver: zodResolver(tavoloSchema),
    defaultValues: {
      numero: tavolo.numero,
      posti: tavolo.posti,
      posizione: tavolo.posizione ?? "",
      attivo: tavolo.attivo,
    } as z.input<typeof tavoloSchema>,
  });

  function onSubmit(values: TavoloInput) {
    startTransition(async () => {
      const r = await updateTavolo(tavolo.id, ristoranteId, values);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Tavolo aggiornato");
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
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <header className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Modifica tavolo</h3>
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
          <div className="space-y-1.5">
            <Label>Numero</Label>
            <Input {...register("numero")} />
            {errors.numero && (
              <p className="text-xs text-destructive">{errors.numero.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Posti</Label>
            <Input type="number" min={1} {...register("posti")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Posizione (opzionale)</Label>
            <Input
              placeholder="Sala interna, terrazza…"
              {...register("posizione")}
            />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" {...register("attivo")} />
            Tavolo attivo (prenotabile)
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={pending}>
            Annulla
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={pending}
            className="rounded-xl bg-brand-600 hover:bg-brand-700"
          >
            {pending && <Loader2 className="mr-1.5 size-3.5 animate-spin" />}
            Salva
          </Button>
        </div>
      </form>
    </div>
  );
}
