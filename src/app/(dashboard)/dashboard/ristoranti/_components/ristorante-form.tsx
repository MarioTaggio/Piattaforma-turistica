"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRistorante, updateRistorante } from "@/lib/gestore/ristoranti";
import {
  ristoranteSchema,
  type RistoranteInput,
} from "@/lib/gestore/ristoranti-schemas";

type Props = {
  mode: "create" | "edit";
  id?: string;
  defaultValues: RistoranteInput;
};

export function RistoranteForm({ mode, id, defaultValues }: Props) {
  const router = useRouter();
  const tForm = useTranslations("form");
  const tMessages = useTranslations("messages");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof ristoranteSchema>, unknown, RistoranteInput>({
    resolver: zodResolver(ristoranteSchema),
    defaultValues: defaultValues as z.input<typeof ristoranteSchema>,
  });

  async function onSubmit(values: RistoranteInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createRistorante(values)
        : await updateRistorante(id!, values);
    if ("error" in result) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(tMessages("saveSuccess"));
    router.push(`/dashboard/ristoranti/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={tForm("name")}
          error={errors.nome?.message}
          className="sm:col-span-2"
        >
          <Input {...register("nome")} />
        </Field>

        <Field
          label={tForm("description")}
          error={errors.descrizione?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("descrizione")}
          />
        </Field>

        <Field
          label={tForm("address")}
          error={errors.indirizzo?.message}
          className="sm:col-span-2"
        >
          <Input {...register("indirizzo")} />
        </Field>

        <Field label={tForm("city")} error={errors.citta?.message}>
          <Input {...register("citta")} />
        </Field>

        <Field label={tForm("phone")} error={errors.telefono?.message}>
          <Input {...register("telefono")} />
        </Field>

        <Field label={tForm("email")} error={errors.email?.message}>
          <Input type="email" {...register("email")} />
        </Field>

        <Field label={tForm("cuisine")} error={errors.tipo_cucina?.message}>
          <Input {...register("tipo_cucina")} />
        </Field>

        <Field
          label={tForm("hours")}
          error={errors.orari?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("orari")}
          />
        </Field>

        <Field
          label={tForm("images")}
          hint={tForm("imagesHint")}
          error={errors.immagini?.message}
          className="sm:col-span-2"
        >
          <Input {...register("immagini")} />
        </Field>

        <Field
          label={tForm("stato")}
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
