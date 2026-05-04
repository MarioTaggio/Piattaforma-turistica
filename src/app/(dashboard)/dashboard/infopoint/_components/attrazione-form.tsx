"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
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
    toast.success(
      mode === "create" ? "Attrazione creata" : "Attrazione aggiornata",
    );
    router.push(`/dashboard/infopoint/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome"
          error={errors.nome?.message}
          className="sm:col-span-2"
        >
          <Input placeholder="Es. Museo Civico" {...register("nome")} />
        </Field>

        <Field
          label="Descrizione"
          error={errors.descrizione?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Cosa rende speciale questa attrazione…"
            {...register("descrizione")}
          />
        </Field>

        <Field
          label="Indirizzo"
          error={errors.indirizzo?.message}
          className="sm:col-span-2"
        >
          <Input placeholder="Via Roma 12" {...register("indirizzo")} />
        </Field>

        <Field label="Città" error={errors.citta?.message}>
          <Input placeholder="Bologna" {...register("citta")} />
        </Field>

        <Field label="Categoria" error={errors.categoria?.message}>
          <Input
            placeholder="Museo, Monumento, Parco…"
            {...register("categoria")}
          />
        </Field>

        <Field
          label="Orari"
          hint="Testo libero, es: 'Mar-Dom 9:00-18:00'"
          error={errors.orari?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={2}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Mar-Dom 9:00-18:00"
            {...register("orari")}
          />
        </Field>

        <Field
          label="Immagini"
          hint="URL separati da virgola"
          error={errors.immagini?.message}
          className="sm:col-span-2"
        >
          <Input
            placeholder="https://..., https://..."
            {...register("immagini")}
          />
        </Field>

        <Field
          label="URL Tour Virtuale"
          hint="Link a Matterport, Roundme, Pannellum, ecc."
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
          <span className="text-sm">Tour virtuale accessibile gratuitamente</span>
        </label>

        <Field
          label="Stato"
          error={errors.stato?.message}
          className="sm:col-span-2"
        >
          <select
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("stato")}
          >
            <option value="bozza">Bozza</option>
            <option value="pubblicato">Pubblicato</option>
            <option value="archiviato">Archiviato</option>
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
          Annulla
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-brand-600 hover:bg-brand-700"
        >
          {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
          {mode === "create" ? "Crea attrazione" : "Salva modifiche"}
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
