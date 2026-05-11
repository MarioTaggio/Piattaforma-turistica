"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EurInput } from "@/components/dashboard/eur-input";
import { ImageUploader } from "@/components/dashboard/image-uploader";
import {
  shopProdottoSchema,
  type ShopProdottoInput,
} from "@/lib/gestore/shop-schemas";
import {
  deleteShopProdotto,
  updateShopProdotto,
} from "@/lib/gestore/shop";

type Props = {
  shopId: string;
  prodottoId: string;
  defaultValues: {
    nome: string;
    descrizione: string;
    prezzo_cents: number;
    categoria: string;
    immagine_url: string;
    disponibile: boolean;
  };
};

export function EditProdottoForm({ shopId, prodottoId, defaultValues }: Props) {
  const router = useRouter();
  const tForm = useTranslations("form");
  const tMessages = useTranslations("messages");
  const [deleting, startDelete] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof shopProdottoSchema>, unknown, ShopProdottoInput>({
    resolver: zodResolver(shopProdottoSchema),
    defaultValues: defaultValues as z.input<typeof shopProdottoSchema>,
  });

  const immagineUrl = watch("immagine_url") ?? "";

  async function onSubmit(values: ShopProdottoInput) {
    const r = await updateShopProdotto(prodottoId, shopId, values);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success(tMessages("saveSuccess"));
    router.refresh();
  }

  function onDelete() {
    if (!confirm(tForm("confirmDelete"))) return;
    startDelete(async () => {
      const r = await deleteShopProdotto(prodottoId, shopId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(tMessages("deleteSuccess"));
      router.push(`/dashboard/shop/${shopId}`);
    });
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5"
      noValidate
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>{tForm("name")}</Label>
          <Input {...register("nome")} />
          {errors.nome && (
            <p className="text-xs text-destructive">{errors.nome.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>{tForm("category")}</Label>
          <Input {...register("categoria")} />
        </div>
        <div className="space-y-1.5">
          <Label>{tForm("price")}</Label>
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
          {errors.prezzo_cents && (
            <p className="text-xs text-destructive">
              {errors.prezzo_cents.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label>{tForm("description")}</Label>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("descrizione")}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-3">
          <Label>{tForm("image")}</Label>
          <ImageUploader
            value={immagineUrl}
            onChange={(url) =>
              setValue("immagine_url", url, { shouldDirty: true })
            }
            label={tForm("imageHint")}
          />
        </div>
        <label className="flex items-center gap-2 sm:col-span-3">
          <input type="checkbox" {...register("disponibile")} />
          <span className="text-sm">{tForm("available")}</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          {deleting ? (
            <Loader2 className="mr-1.5 size-3.5 animate-spin" />
          ) : (
            <Trash2 className="mr-1.5 size-3.5" />
          )}
          {tForm("delete")}
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
          {tForm("saveChanges")}
        </Button>
      </div>
    </form>
  );
}
