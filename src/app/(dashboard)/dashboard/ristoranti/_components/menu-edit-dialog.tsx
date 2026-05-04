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
import { ImageUploader } from "@/components/dashboard/image-uploader";
import { updateProdotto } from "@/lib/gestore/ristoranti";
import {
  prodottoSchema,
  type ProdottoInput,
} from "@/lib/gestore/ristoranti-schemas";

import type { Prodotto } from "./prodotti-section";

type Props = {
  prodotto: Prodotto & { descrizione?: string | null };
  ristoranteId: string;
};

export function MenuEditDialog({ prodotto, ristoranteId }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 w-7 rounded-lg p-0"
        onClick={() => setOpen(true)}
        title="Modifica voce"
      >
        <Pencil className="size-3.5" />
      </Button>
      {open && (
        <Modal
          prodotto={prodotto}
          ristoranteId={ristoranteId}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function Modal({
  prodotto,
  ristoranteId,
  onClose,
}: {
  prodotto: Prodotto & { descrizione?: string | null };
  ristoranteId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<z.input<typeof prodottoSchema>, unknown, ProdottoInput>({
    resolver: zodResolver(prodottoSchema),
    defaultValues: {
      nome: prodotto.nome,
      descrizione: prodotto.descrizione ?? "",
      prezzo_cents: prodotto.prezzo_cents,
      categoria: prodotto.categoria ?? "",
      immagine_url: prodotto.immagine_url ?? "",
    } as z.input<typeof prodottoSchema>,
  });

  const immagineUrl = watch("immagine_url") ?? "";

  function onSubmit(values: ProdottoInput) {
    startTransition(async () => {
      const r = await updateProdotto(prodotto.id, ristoranteId, values);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Voce aggiornata");
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
          <h3 className="text-base font-semibold">Modifica voce di menu</h3>
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
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Nome</Label>
            <Input {...register("nome")} />
            {errors.nome && (
              <p className="text-xs text-destructive">{errors.nome.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Input {...register("categoria")} />
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
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Descrizione</Label>
            <textarea
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("descrizione")}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Immagine</Label>
            <ImageUploader
              value={immagineUrl}
              onChange={(url) =>
                setValue("immagine_url", url, { shouldDirty: true })
              }
              label="Carica una foto del piatto"
            />
          </div>
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
