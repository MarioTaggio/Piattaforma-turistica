"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, X } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EurInput } from "@/components/dashboard/eur-input";
import { updateVisita } from "@/lib/gestore/infopoint";
import {
  visitaSchema,
  type VisitaInput,
} from "@/lib/gestore/infopoint-schemas";

import type { Visita } from "./visite-section";

type Props = {
  visita: Visita & { descrizione?: string | null };
  attrazioneId: string;
};

function toLocalInput(iso: string): string {
  // Convert ISO timestamp to "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function VisitaEditDialog({ visita, attrazioneId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-lg p-0"
        onClick={() => setOpen(true)}
        title="Modifica visita"
      >
        <Pencil className="size-3.5" />
      </Button>
      {open && (
        <Modal
          visita={visita}
          attrazioneId={attrazioneId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Modal({
  visita,
  attrazioneId,
  onClose,
}: {
  visita: Visita & { descrizione?: string | null };
  attrazioneId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<z.input<typeof visitaSchema>, unknown, VisitaInput>({
    resolver: zodResolver(visitaSchema),
    defaultValues: {
      titolo: visita.titolo,
      descrizione: visita.descrizione ?? "",
      data_ora: toLocalInput(visita.data_ora),
      durata_minuti: visita.durata_minuti,
      posti_totali: visita.posti_totali,
      prezzo_cents: visita.prezzo_cents,
      lingua: visita.lingua,
      stato: visita.stato as "bozza" | "pubblicato" | "archiviato",
    } as z.input<typeof visitaSchema>,
  });

  function onSubmit(values: VisitaInput) {
    startTransition(async () => {
      const r = await updateVisita(visita.id, attrazioneId, values);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Visita aggiornata");
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
        className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <header className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Modifica visita guidata</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Titolo</Label>
            <Input {...register("titolo")} />
            {errors.titolo && (
              <p className="text-xs text-destructive">{errors.titolo.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Data e ora</Label>
            <Input type="datetime-local" {...register("data_ora")} />
            {errors.data_ora && (
              <p className="text-xs text-destructive">
                {errors.data_ora.message}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Durata (min)</Label>
            <Input
              type="number"
              min={15}
              step={15}
              {...register("durata_minuti")}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Posti totali</Label>
            <Input type="number" min={1} {...register("posti_totali")} />
          </div>
          <div className="space-y-1.5">
            <Label>Prezzo</Label>
            <Controller
              control={control}
              name="prezzo_cents"
              render={({ field }) => (
                <EurInput
                  valueCents={
                    typeof field.value === "number"
                      ? field.value
                      : Number(field.value) || 0
                  }
                  onChangeCents={field.onChange}
                />
              )}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Lingua</Label>
            <Input {...register("lingua")} />
          </div>
          <div className="space-y-1.5">
            <Label>Stato</Label>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("stato")}
            >
              <option value="bozza">Bozza</option>
              <option value="pubblicato">Pubblicato</option>
              <option value="archiviato">Archiviato</option>
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Descrizione</Label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("descrizione")}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={pending}
          >
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
