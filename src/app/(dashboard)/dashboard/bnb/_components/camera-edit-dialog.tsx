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
import { updateCamera } from "@/lib/gestore/bnb";
import { cameraSchema, type CameraInput } from "@/lib/gestore/bnb-schemas";

import type { Camera } from "./camere-section";

type Props = {
  camera: Camera & { descrizione?: string | null };
  strutturaId: string;
};

export function CameraEditDialog({ camera, strutturaId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-lg p-0"
        onClick={() => setOpen(true)}
        title="Modifica camera"
      >
        <Pencil className="size-3.5" />
      </Button>
      {open && (
        <Modal camera={camera} strutturaId={strutturaId} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

function Modal({
  camera,
  strutturaId,
  onClose,
}: {
  camera: Camera & { descrizione?: string | null };
  strutturaId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof cameraSchema>, unknown, CameraInput>({
    resolver: zodResolver(cameraSchema),
    defaultValues: {
      nome: camera.nome,
      descrizione: camera.descrizione ?? "",
      capacita: camera.capacita,
      prezzo_notte_cents: camera.prezzo_notte_cents,
      disponibile: camera.disponibile,
    } as z.input<typeof cameraSchema>,
  });

  function onSubmit(values: CameraInput) {
    startTransition(async () => {
      const r = await updateCamera(camera.id, strutturaId, values);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Camera aggiornata");
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Modifica camera"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="w-full max-w-lg space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
        noValidate
      >
        <header className="flex items-start justify-between gap-3">
          <h3 className="text-base font-semibold">Modifica camera</h3>
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome</Label>
            <Input {...register("nome")} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Capacità</Label>
            <Input type="number" min={1} {...register("capacita")} />
          </div>
          <div className="space-y-1.5">
            <Label>Prezzo / notte</Label>
            <Controller
              control={control}
              name="prezzo_notte_cents"
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Descrizione</Label>
            <Input {...register("descrizione")} />
          </div>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" {...register("disponibile")} />
            Camera disponibile
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={pending || isSubmitting}
          >
            Annulla
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={pending || isSubmitting}
            className="rounded-xl bg-brand-600 hover:bg-brand-700"
          >
            {(pending || isSubmitting) && (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            )}
            Salva
          </Button>
        </div>
      </form>
    </div>
  );
}
