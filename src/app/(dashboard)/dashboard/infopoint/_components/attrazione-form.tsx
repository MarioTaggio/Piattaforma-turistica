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
import { createAttrazione, updateAttrazione } from "@/lib/gestore/infopoint";
import {
  attrazioneSchema,
  type AttrazioneInput,
} from "@/lib/gestore/infopoint-schemas";

type Props = {
  mode: "create" | "edit";
  id?: string;
  defaultValues: AttrazioneInput;
};

export function AttrazioneForm({ mode, id, defaultValues }: Props) {
  const router = useRouter();
  const tForm = useTranslations("form");
  const tMessages = useTranslations("messages");
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof attrazioneSchema>, unknown, AttrazioneInput>({
    resolver: zodResolver(attrazioneSchema),
    defaultValues: defaultValues as z.input<typeof attrazioneSchema>,
  });

  async function onSubmit(values: AttrazioneInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createAttrazione(values)
        : await updateAttrazione(id!, values);
    if ("error" in result) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(tMessages("saveSuccess"));
    router.push(`/dashboard/infopoint/${result.id}`);
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

        <Field label={tForm("category")} error={errors.categoria?.message}>
          <Input {...register("categoria")} />
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
          label={tForm("tourUrl")}
          error={errors.tour_url?.message}
          className="sm:col-span-2"
        >
          <Input
            type="url"
            placeholder="https://my.matterport.com/show/..."
            {...register("tour_url")}
          />
        </Field>

        <label className="flex items-center gap-2 sm:col-span-2">
          <input
            type="checkbox"
            defaultChecked={defaultValues.tour_gratuito}
            {...register("tour_gratuito")}
          />
          <span className="text-sm">{tForm("tourFree")}</span>
        </label>

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
