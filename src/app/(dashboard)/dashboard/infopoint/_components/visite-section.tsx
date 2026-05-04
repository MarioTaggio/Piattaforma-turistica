"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EurInput } from "@/components/dashboard/eur-input";
import { createVisita, deleteVisita } from "@/lib/gestore/infopoint";
import {
  visitaSchema,
  type VisitaInput,
} from "@/lib/gestore/infopoint-schemas";
import {
  formatDateTime,
  formatEurFromCents,
} from "@/lib/utils/format";
import { StatusBadge } from "@/components/dashboard/status-badge";

import { VisitaEditDialog } from "./visita-edit-dialog";

export type Visita = {
  id: string;
  titolo: string;
  descrizione?: string | null;
  data_ora: string;
  durata_minuti: number;
  posti_totali: number;
  posti_disponibili: number;
  prezzo_cents: number;
  lingua: string;
  stato: string;
};

export function VisiteSection({
  attrazioneId,
  visite,
}: {
  attrazioneId: string;
  visite: Visita[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(visite.length === 0);
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof visitaSchema>, unknown, VisitaInput>({
    resolver: zodResolver(visitaSchema),
    defaultValues: {
      titolo: "",
      descrizione: "",
      data_ora: "",
      durata_minuti: 60,
      posti_totali: 10,
      prezzo_cents: 0,
      lingua: "it",
      stato: "bozza",
    } as z.input<typeof visitaSchema>,
  });

  async function onSubmit(values: VisitaInput) {
    const r = await createVisita(attrazioneId, values);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Visita aggiunta");
    reset();
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm("Eliminare questa visita?")) return;
    startTransition(async () => {
      const r = await deleteVisita(id, attrazioneId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Visita eliminata");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Visite guidate</h3>
          <p className="text-xs text-muted-foreground">
            {visite.length === 0
              ? "Aggiungi la prima visita guidata."
              : `${visite.length} visit${visite.length === 1 ? "a" : "e"} programmata${visite.length === 1 ? "" : "e"}.`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => setShowForm((s) => !s)}
        >
          <Plus className="mr-1.5 size-3.5" />
          Aggiungi visita
        </Button>
      </div>

      {visite.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">Titolo</th>
                <th className="px-4 py-2 font-medium">Quando</th>
                <th className="px-4 py-2 font-medium">Posti</th>
                <th className="px-4 py-2 font-medium">Prezzo</th>
                <th className="px-4 py-2 font-medium">Stato</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visite.map((v) => (
                <tr key={v.id}>
                  <td className="px-4 py-2 font-medium">
                    {v.titolo}
                    <div className="text-xs text-muted-foreground">
                      {v.lingua.toUpperCase()} · {v.durata_minuti} min
                    </div>
                  </td>
                  <td className="px-4 py-2">{formatDateTime(v.data_ora)}</td>
                  <td className="px-4 py-2">
                    {v.posti_totali - v.posti_disponibili}/{v.posti_totali}
                  </td>
                  <td className="px-4 py-2">
                    {v.prezzo_cents === 0
                      ? "Gratis"
                      : formatEurFromCents(v.prezzo_cents)}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge kind="pubblicazione" value={v.stato} />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <VisitaEditDialog visita={v} attrazioneId={attrazioneId} />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onDelete(v.id)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-xl border border-dashed border-border bg-muted/20 p-4"
          noValidate
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Titolo</Label>
              <Input
                placeholder="Tour guidato del centro storico"
                {...register("titolo")}
              />
              {errors.titolo && (
                <p className="text-xs text-destructive">
                  {errors.titolo.message}
                </p>
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
              {errors.durata_minuti && (
                <p className="text-xs text-destructive">
                  {errors.durata_minuti.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Posti totali</Label>
              <Input
                type="number"
                min={1}
                {...register("posti_totali")}
              />
              {errors.posti_totali && (
                <p className="text-xs text-destructive">
                  {errors.posti_totali.message}
                </p>
              )}
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
              {errors.prezzo_cents && (
                <p className="text-xs text-destructive">
                  {errors.prezzo_cents.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Lingua</Label>
              <Input placeholder="it" {...register("lingua")} />
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
              <Label>Descrizione (opzionale)</Label>
              <Input
                placeholder="Cosa si vede in questa visita…"
                {...register("descrizione")}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Annulla
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              {isSubmitting && (
                <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              )}
              Aggiungi visita
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
