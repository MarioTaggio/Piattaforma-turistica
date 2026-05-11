"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRecensione } from "@/lib/recensioni/actions";
import {
  recensioneSchema,
  type RecensioneInput,
} from "@/lib/recensioni/schemas";

import { StarInput } from "./star-input";

type Target = {
  evento_id?: string;
  struttura_id?: string;
  ristorante_id?: string;
  prodotto_id?: string;
  corso_id?: string;
  attrazione_id?: string;
};

export function ReviewForm({ target }: { target: Target }) {
  const router = useRouter();
  const [done, setDone] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof recensioneSchema>, unknown, RecensioneInput>({
    resolver: zodResolver(recensioneSchema),
    defaultValues: {
      voto: 5,
      titolo: "",
      testo: "",
      ...target,
    } as z.input<typeof recensioneSchema>,
  });

  async function onSubmit(values: RecensioneInput) {
    const result = await createRecensione(values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Recensione inviata. Sarà visibile dopo l'approvazione.");
    setDone(true);
    router.refresh();
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Grazie! La tua recensione è in attesa di approvazione e sarà
        pubblicata sul sito non appena il gestore l'avrà confermata.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-1.5">
        <Label>Voto</Label>
        <Controller
          control={control}
          name="voto"
          render={({ field }) => (
            <StarInput
              value={typeof field.value === "number" ? field.value : Number(field.value) || 0}
              onChange={field.onChange}
            />
          )}
        />
        {errors.voto && (
          <p className="text-xs text-destructive">{errors.voto.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="titolo-rec">Titolo</Label>
        <Input
          id="titolo-rec"
          placeholder="Riassumi la tua esperienza"
          maxLength={120}
          {...register("titolo")}
        />
        {errors.titolo && (
          <p className="text-xs text-destructive">{errors.titolo.message}</p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="testo-rec">Racconta la tua esperienza</Label>
        <textarea
          id="testo-rec"
          rows={5}
          maxLength={2000}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          {...register("testo")}
        />
        {errors.testo && (
          <p className="text-xs text-destructive">{errors.testo.message}</p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        La tua recensione sarà visibile dopo l&apos;approvazione del gestore.
      </p>

      <Button
        type="submit"
        disabled={isSubmitting}
        className="rounded-xl bg-brand-600 hover:bg-brand-700"
      >
        {isSubmitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        Invia recensione
      </Button>
    </form>
  );
}
