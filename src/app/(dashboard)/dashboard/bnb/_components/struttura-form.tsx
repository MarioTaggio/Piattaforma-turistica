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
import { createStruttura, updateStruttura } from "@/lib/gestore/bnb";
import {
  strutturaSchema,
  type StrutturaInput,
} from "@/lib/gestore/bnb-schemas";

type Props = {
  mode: "create" | "edit";
  id?: string;
  defaultValues: StrutturaInput;
};

export function StrutturaForm({ mode, id, defaultValues }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof strutturaSchema>, unknown, StrutturaInput>({
    resolver: zodResolver(strutturaSchema),
    defaultValues: defaultValues as z.input<typeof strutturaSchema>,
  });

  async function onSubmit(values: StrutturaInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createStruttura(values)
        : await updateStruttura(id!, values);
    if ("error" in result) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(mode === "create" ? "Struttura creata" : "Struttura aggiornata");
    router.push(`/dashboard/bnb/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Nome struttura"
          error={errors.nome?.message}
          className="sm:col-span-2"
        >
          <Input placeholder="Es. Casa Verde" {...register("nome")} />
        </Field>

        <Field
          label="Descrizione"
          error={errors.descrizione?.message}
          className="sm:col-span-2"
        >
          <textarea
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Cosa rende speciale la tua struttura…"
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

        <Field label="CAP" error={errors.cap?.message}>
          <Input placeholder="40100" {...register("cap")} />
        </Field>

        <Field
          label="Stelle"
          hint="Da 1 a 5 (opzionale)"
          error={errors.stelle?.message}
        >
          <Input
            type="number"
            min={1}
            max={5}
            {...register("stelle")}
          />
        </Field>

        <Field
          label="Stato"
          error={errors.stato?.message}
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

        <Field
          label="Servizi"
          hint="Separati da virgola: Wi-Fi, Parcheggio, Colazione…"
          error={errors.servizi?.message}
          className="sm:col-span-2"
        >
          <Input
            placeholder="Wi-Fi, Parcheggio, Colazione"
            {...register("servizi")}
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
          {mode === "create" ? "Crea struttura" : "Salva modifiche"}
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
