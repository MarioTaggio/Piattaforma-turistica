"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EurInput } from "@/components/dashboard/eur-input";
import { createCamera, deleteCamera } from "@/lib/gestore/bnb";

import { CameraEditDialog } from "./camera-edit-dialog";
import { cameraSchema, type CameraInput } from "@/lib/gestore/bnb-schemas";
import { formatEurFromCents } from "@/lib/utils/format";

export type Camera = {
  id: string;
  nome: string;
  capacita: number;
  prezzo_notte_cents: number;
  disponibile: boolean;
  descrizione?: string | null;
};

export function CamereSection({
  strutturaId,
  camere,
}: {
  strutturaId: string;
  camere: Camera[];
}) {
  const router = useRouter();
  const tForm = useTranslations("form");
  const tMessages = useTranslations("messages");
  const tDetail = useTranslations("detail");
  const [showForm, setShowForm] = useState(camere.length === 0);
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof cameraSchema>, unknown, CameraInput>({
    resolver: zodResolver(cameraSchema),
    defaultValues: {
      nome: "",
      descrizione: "",
      capacita: 2,
      prezzo_notte_cents: 0,
      disponibile: true,
    } as z.input<typeof cameraSchema>,
  });

  async function onSubmit(values: CameraInput) {
    const result = await createCamera(strutturaId, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(tMessages("saveSuccess"));
    reset();
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm(tForm("confirmDelete"))) return;
    startTransition(async () => {
      const result = await deleteCamera(id, strutturaId);
      if (result.error) {
        toast.error(result.error);
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
          <h3 className="text-base font-semibold">{tDetail("rooms")}</h3>
          <p className="text-xs text-muted-foreground">
            {camere.length}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          onClick={() => setShowForm((s) => !s)}
        >
          <Plus className="mr-1.5 size-3.5" />
          {tForm("addRoom")}
        </Button>
      </div>

      {camere.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">{tForm("name")}</th>
                <th className="px-4 py-2 font-medium">{tForm("capacity")}</th>
                <th className="px-4 py-2 font-medium">{tForm("pricePerNight")}</th>
                <th className="px-4 py-2 font-medium">{tForm("available")}</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {camere.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-2 font-medium">{c.nome}</td>
                  <td className="px-4 py-2">{c.capacita}</td>
                  <td className="px-4 py-2">
                    {formatEurFromCents(c.prezzo_notte_cents)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        c.disponibile
                          ? "text-emerald-700"
                          : "text-muted-foreground"
                      }
                    >
                      {c.disponibile ? tForm("active") : tForm("inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <CameraEditDialog camera={c} strutturaId={strutturaId} />
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onDelete(c.id)}
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label>{tForm("name")}</Label>
              <Input {...register("nome")} />
              {errors.nome && (
                <p className="text-xs text-destructive">
                  {errors.nome.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{tForm("capacity")}</Label>
              <Input type="number" min={1} {...register("capacita")} />
              {errors.capacita && (
                <p className="text-xs text-destructive">
                  {errors.capacita.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>{tForm("pricePerNight")}</Label>
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
              {errors.prezzo_notte_cents && (
                <p className="text-xs text-destructive">
                  {errors.prezzo_notte_cents.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-4">
              <Label>{tForm("description")}</Label>
              <Input {...register("descrizione")} />
            </div>
            <label className="flex items-center gap-2 sm:col-span-4">
              <input type="checkbox" defaultChecked {...register("disponibile")} />
              <span className="text-sm">{tForm("available")}</span>
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
