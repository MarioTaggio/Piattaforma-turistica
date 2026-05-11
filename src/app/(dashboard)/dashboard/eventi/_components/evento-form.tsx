"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EurInput } from "@/components/dashboard/eur-input";
import { ImageUploader } from "@/components/dashboard/image-uploader";
import { createEvento, updateEvento } from "@/lib/gestore/eventi";
import { eventoSchema, type EventoInput } from "@/lib/gestore/eventi-schemas";

type Props = {
  mode: "create" | "edit";
  id?: string;
  defaultValues: EventoInput;
};

export function EventoForm({ mode, id, defaultValues }: Props) {
  const router = useRouter();
  const tForm = useTranslations("form");
  const tMessages = useTranslations("messages");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof eventoSchema>, unknown, EventoInput>({
    resolver: zodResolver(eventoSchema),
    defaultValues: defaultValues as z.input<typeof eventoSchema>,
  });

  const immagineUrl = watch("immagine_url") ?? "";

  async function onSubmit(values: EventoInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createEvento(values)
        : await updateEvento(id!, values);

    if ("error" in result) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(
      mode === "create" ? tMessages("saveSuccess") : tMessages("saveSuccess"),
    );
    router.push(`/dashboard/eventi/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label>{tForm("image")}</Label>
        <ImageUploader
          value={immagineUrl}
          onChange={(url) =>
            setValue("immagine_url", url, { shouldDirty: true })
          }
          label={tForm("imageHint")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={tForm("title")}
          error={errors.titolo?.message}
          className="sm:col-span-2"
        >
          <Input
            aria-invalid={!!errors.titolo}
            {...register("titolo")}
          />
        </Field>

        <Field
          label={tForm("description")}
          error={errors.descrizione?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={!!errors.descrizione}
            {...register("descrizione")}
          />
        </Field>

        <Field label={tForm("location")} error={errors.luogo?.message}>
          <Input
            aria-invalid={!!errors.luogo}
            {...register("luogo")}
          />
        </Field>

        <Field label="Città" error={errors.citta?.message}>
          <Input {...register("citta")} />
        </Field>

        <Field label={tForm("startDateTime")} error={errors.data_inizio?.message}>
          <Input
            type="datetime-local"
            aria-invalid={!!errors.data_inizio}
            {...register("data_inizio")}
          />
        </Field>

        <Field label={tForm("endDateTime")} error={errors.data_fine?.message}>
          <Input
            type="datetime-local"
            aria-invalid={!!errors.data_fine}
            {...register("data_fine")}
          />
        </Field>

        <Field
          label={tForm("price")}
          hint={tForm("priceHint")}
          error={errors.prezzo_cents?.message}
        >
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
                aria-invalid={!!errors.prezzo_cents}
              />
            )}
          />
        </Field>

        <Field
          label={tForm("totalSeats")}
          error={errors.posti_totali?.message}
        >
          <Input
            type="number"
            min={1}
            aria-invalid={!!errors.posti_totali}
            {...register("posti_totali")}
          />
        </Field>

        <Field
          label={tForm("stato")}
          hint={tForm("statoHint")}
          error={errors.stato?.message}
          className="sm:col-span-2"
        >
          <select
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("stato")}
          >
            <option value="bozza">{tForm("stato_bozza")}</option>
            <option value="pubblicato">{tForm("stato_pubblicato")}</option>
            <option value="archiviato">{tForm("stato_archiviato")}</option>
          </select>
        </Field>
      </div>

      {serverError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="rounded-xl"
        >
          {tForm("cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-brand-600 hover:bg-brand-700"
        >
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {mode === "create" ? tForm("create") : tForm("saveChanges")}
        </Button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label>{label}</Label>
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
