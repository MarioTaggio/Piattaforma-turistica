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
import { ImageUploader } from "@/components/dashboard/image-uploader";
import { updateLezione } from "@/lib/gestore/video";
import { lezioneSchema, type LezioneInput } from "@/lib/gestore/video-schemas";

import type { Lezione } from "./lezioni-section";

type Props = {
  lezione: Lezione & { descrizione?: string | null };
  corsoId: string;
};

export function LezioneEditDialog({ lezione, corsoId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-lg p-0"
        onClick={() => setOpen(true)}
        title="Modifica lezione"
      >
        <Pencil className="size-3.5" />
      </Button>
      {open && (
        <Modal
          lezione={lezione}
          corsoId={corsoId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Modal({
  lezione,
  corsoId,
  onClose,
}: {
  lezione: Lezione & { descrizione?: string | null };
  corsoId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof lezioneSchema>, unknown, LezioneInput>({
    resolver: zodResolver(lezioneSchema),
    defaultValues: {
      titolo: lezione.titolo,
      descrizione: lezione.descrizione ?? "",
      video_url: lezione.video_url,
      durata_secondi: lezione.durata_secondi,
      ordine: lezione.ordine,
      anteprima_gratuita: lezione.anteprima_gratuita,
    } as z.input<typeof lezioneSchema>,
  });

  const videoUrl = watch("video_url") ?? "";

  function onSubmit(values: LezioneInput) {
    startTransition(async () => {
      const r = await updateLezione(lezione.id, corsoId, values);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Lezione aggiornata");
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
        className="w-full max-w-xl space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <header className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Modifica lezione</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="space-y-2">
          <Label>Video</Label>
          <ImageUploader
            bucket="videos"
            accept="video/*"
            value={videoUrl}
            onChange={(url) =>
              setValue("video_url", url, { shouldDirty: true })
            }
            label="Sostituisci il file video"
          />
          {errors.video_url && (
            <p className="text-xs text-destructive">
              {errors.video_url.message}
            </p>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Titolo</Label>
            <Input {...register("titolo")} />
            {errors.titolo && (
              <p className="text-xs text-destructive">{errors.titolo.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Ordine</Label>
            <Input type="number" min={1} {...register("ordine")} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Durata (sec)</Label>
            <Input type="number" min={1} {...register("durata_secondi")} />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Descrizione</Label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("descrizione")}
            />
          </div>
          <label className="flex items-center gap-2 sm:col-span-3">
            <input type="checkbox" {...register("anteprima_gratuita")} />
            <span className="text-sm">Anteprima gratuita</span>
          </label>
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
