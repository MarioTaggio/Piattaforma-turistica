"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTavolo, deleteTavolo } from "@/lib/gestore/ristoranti";

import { TavoloEditDialog } from "./tavolo-edit-dialog";
import {
  tavoloSchema,
  type TavoloInput,
} from "@/lib/gestore/ristoranti-schemas";

export type Tavolo = {
  id: string;
  numero: string;
  posti: number;
  posizione: string | null;
  attivo: boolean;
};

export function TavoliSection({
  ristoranteId,
  tavoli,
}: {
  ristoranteId: string;
  tavoli: Tavolo[];
}) {
  const router = useRouter();
  const tForm = useTranslations("form");
  const tMessages = useTranslations("messages");
  const [showForm, setShowForm] = useState(tavoli.length === 0);
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof tavoloSchema>, unknown, TavoloInput>({
    resolver: zodResolver(tavoloSchema),
    defaultValues: {
      numero: "",
      posti: 2,
      posizione: "",
      attivo: true,
    } as z.input<typeof tavoloSchema>,
  });

  async function onSubmit(values: TavoloInput) {
    const r = await createTavolo(ristoranteId, values);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success(tMessages("saveSuccess"));
    reset();
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm(tForm("confirmDelete"))) return;
    startTransition(async () => {
      const r = await deleteTavolo(id, ristoranteId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(tMessages("deleteSuccess"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Tavoli</h3>
          <p className="text-xs text-muted-foreground">{tavoli.length}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => setShowForm((s) => !s)}
        >
          <Plus className="mr-1.5 size-3.5" />
          {tForm("addTable")}
        </Button>
      </div>

      {tavoli.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">{tForm("tableNumber")}</th>
                <th className="px-4 py-2 font-medium">{tForm("tableSeats")}</th>
                <th className="px-4 py-2 font-medium">{tForm("location")}</th>
                <th className="px-4 py-2 font-medium">{tForm("active")}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tavoli.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2 font-medium">{t.numero}</td>
                  <td className="px-4 py-2">{t.posti}</td>
                  <td className="px-4 py-2">{t.posizione ?? "—"}</td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        t.attivo
                          ? "text-emerald-700"
                          : "text-muted-foreground"
                      }
                    >
                      {t.attivo ? tForm("active") : tForm("inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <TavoloEditDialog tavolo={t} ristoranteId={ristoranteId} />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onDelete(t.id)}
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
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label>{tForm("tableNumber")}</Label>
              <Input {...register("numero")} />
              {errors.numero && (
                <p className="text-xs text-destructive">
                  {errors.numero.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{tForm("tableSeats")}</Label>
              <Input type="number" min={1} {...register("posti")} />
              {errors.posti && (
                <p className="text-xs text-destructive">
                  {errors.posti.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{tForm("location")}</Label>
              <Input {...register("posizione")} />
            </div>
            <label className="flex items-center gap-2 sm:col-span-4">
              <input type="checkbox" defaultChecked {...register("attivo")} />
              <span className="text-sm">{tForm("active")}</span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              {tForm("cancel")}
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
              {tForm("create")}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
