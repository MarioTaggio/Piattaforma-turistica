"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploader } from "@/components/dashboard/image-uploader";
import {
  createLezione,
  deleteLezione,
  moveLezione,
} from "@/lib/gestore/video";
import { lezioneSchema, type LezioneInput } from "@/lib/gestore/video-schemas";
import { formatDuration } from "@/lib/utils/format";

import { LezioneEditDialog } from "./lezione-edit-dialog";

export type Lezione = {
  id: string;
  titolo: string;
  descrizione?: string | null;
  ordine: number;
  durata_secondi: number;
  anteprima_gratuita: boolean;
  video_url: string;
};

export function LezioniSection({
  corsoId,
  lezioni,
}: {
  corsoId: string;
  lezioni: Lezione[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(lezioni.length === 0);
  const [pending, startTransition] = useTransition();

  const nextOrdine =
    lezioni.length === 0 ? 1 : Math.max(...lezioni.map((l) => l.ordine)) + 1;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof lezioneSchema>, unknown, LezioneInput>({
    resolver: zodResolver(lezioneSchema),
    defaultValues: {
      titolo: "",
      descrizione: "",
      video_url: "",
      durata_secondi: 60,
      ordine: nextOrdine,
      anteprima_gratuita: false,
    } as z.input<typeof lezioneSchema>,
  });

  const videoUrl = watch("video_url") ?? "";

  async function onSubmit(values: LezioneInput) {
    const r = await createLezione(corsoId, values);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Lezione aggiunta");
    reset({
      titolo: "",
      descrizione: "",
      video_url: "",
      durata_secondi: 60,
      ordine: values.ordine + 1,
      anteprima_gratuita: false,
    });
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm("Eliminare questa lezione?")) return;
    startTransition(async () => {
      const r = await deleteLezione(id, corsoId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Lezione eliminata");
      router.refresh();
    });
  }

  function onMove(id: string, direction: "up" | "down") {
    startTransition(async () => {
      const r = await moveLezione(id, corsoId, direction);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Lezioni</h3>
          <p className="text-xs text-muted-foreground">
            {lezioni.length === 0
              ? "Aggiungi la prima lezione caricando un video."
              : `${lezioni.length} lezione${lezioni.length === 1 ? "" : "i"} pubblicata${lezioni.length === 1 ? "" : "e"}.`}
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
          Aggiungi lezione
        </Button>
      </div>

      {lezioni.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">#</th>
                <th className="px-4 py-2 font-medium">Titolo</th>
                <th className="px-4 py-2 font-medium">Durata</th>
                <th className="px-4 py-2 font-medium">Anteprima</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lezioni.map((l, idx) => (
                <tr key={l.id}>
                  <td className="px-4 py-2 font-mono text-xs">{l.ordine}</td>
                  <td className="px-4 py-2 font-medium">{l.titolo}</td>
                  <td className="px-4 py-2">
                    {formatDuration(l.durata_secondi)}
                  </td>
                  <td className="px-4 py-2">
                    {l.anteprima_gratuita ? (
                      <span className="text-emerald-700">Sì</span>
                    ) : (
                      <span className="text-muted-foreground">No</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg p-0"
                        disabled={pending || idx === 0}
                        onClick={() => onMove(l.id, "up")}
                        title="Sposta su"
                      >
                        <ArrowUp className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg p-0"
                        disabled={pending || idx === lezioni.length - 1}
                        onClick={() => onMove(l.id, "down")}
                        title="Sposta giù"
                      >
                        <ArrowDown className="size-3.5" />
                      </Button>
                      <LezioneEditDialog lezione={l} corsoId={corsoId} />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onDelete(l.id)}
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
          <div className="space-y-2">
            <Label>Video</Label>
            <ImageUploader
              bucket="videos"
              accept="video/*"
              value={videoUrl}
              onChange={(url) =>
                setValue("video_url", url, { shouldDirty: true })
              }
              label="Carica il file video"
            />
            {errors.video_url && (
              <p className="text-xs text-destructive">
                {errors.video_url.message}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Titolo</Label>
              <Input placeholder="Lezione 1: introduzione" {...register("titolo")} />
              {errors.titolo && (
                <p className="text-xs text-destructive">
                  {errors.titolo.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Ordine</Label>
              <Input type="number" min={1} {...register("ordine")} />
              {errors.ordine && (
                <p className="text-xs text-destructive">
                  {errors.ordine.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Durata (sec)</Label>
              <Input type="number" min={1} {...register("durata_secondi")} />
              {errors.durata_secondi && (
                <p className="text-xs text-destructive">
                  {errors.durata_secondi.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-4">
              <Label>Descrizione (opzionale)</Label>
              <Input
                placeholder="Cosa si impara in questa lezione…"
                {...register("descrizione")}
              />
            </div>
            <label className="flex items-center gap-2 sm:col-span-4">
              <input type="checkbox" {...register("anteprima_gratuita")} />
              <span className="text-sm">
                Mostra come anteprima gratuita (visibile a tutti)
              </span>
            </label>
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
              Aggiungi lezione
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
