"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EurInput } from "@/components/dashboard/eur-input";
import { ImageUploader } from "@/components/dashboard/image-uploader";
import { createShopProdotto, deleteShopProdotto } from "@/lib/gestore/shop";
import {
  shopProdottoSchema,
  type ShopProdottoInput,
} from "@/lib/gestore/shop-schemas";
import { formatEurFromCents } from "@/lib/utils/format";

export type ShopProdotto = {
  id: string;
  nome: string;
  categoria: string | null;
  prezzo_cents: number;
  immagine_url: string | null;
  disponibile: boolean;
};

export function ShopProdottiSection({
  shopId,
  prodotti,
}: {
  shopId: string;
  prodotti: ShopProdotto[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(prodotti.length === 0);
  const [pending, startTransition] = useTransition();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof shopProdottoSchema>, unknown, ShopProdottoInput>({
    resolver: zodResolver(shopProdottoSchema),
    defaultValues: {
      nome: "",
      descrizione: "",
      prezzo_cents: 0,
      categoria: "",
      immagine_url: "",
      disponibile: true,
    } as z.input<typeof shopProdottoSchema>,
  });

  const immagineUrl = watch("immagine_url") ?? "";

  async function onSubmit(values: ShopProdottoInput) {
    const r = await createShopProdotto(shopId, values);
    if (r.error) {
      toast.error(r.error);
      return;
    }
    toast.success("Prodotto aggiunto");
    reset();
    router.refresh();
  }

  function onDelete(id: string) {
    if (!confirm("Eliminare questo prodotto?")) return;
    startTransition(async () => {
      const r = await deleteShopProdotto(id, shopId);
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success("Prodotto eliminato");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold">Catalogo prodotti</h3>
          <p className="text-xs text-muted-foreground">
            {prodotti.length === 0
              ? "Aggiungi il primo prodotto del tuo shop."
              : `${prodotti.length} prodott${prodotti.length === 1 ? "o" : "i"} caricat${prodotti.length === 1 ? "o" : "i"}.`}
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
          Aggiungi prodotto
        </Button>
      </div>

      {prodotti.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-4 py-2 font-medium">Prodotto</th>
                <th className="px-4 py-2 font-medium">Categoria</th>
                <th className="px-4 py-2 font-medium">Prezzo</th>
                <th className="px-4 py-2 font-medium">Disponibile</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {prodotti.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-3">
                      {p.immagine_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.immagine_url}
                          alt={p.nome}
                          className="size-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="size-10 rounded-lg bg-brand-50" />
                      )}
                      <span className="font-medium">{p.nome}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {p.categoria ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    {formatEurFromCents(p.prezzo_cents)}
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={
                        p.disponibile
                          ? "text-emerald-700"
                          : "text-muted-foreground"
                      }
                    >
                      {p.disponibile ? "Sì" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        render={
                          <Link
                            href={`/dashboard/shop/${shopId}/prodotti/${p.id}`}
                          />
                        }
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={pending}
                        onClick={() => onDelete(p.id)}
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
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome</Label>
              <Input placeholder="Es. Olio EVO 0,5L" {...register("nome")} />
              {errors.nome && (
                <p className="text-xs text-destructive">{errors.nome.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Input
                placeholder="Olio, Vino, Pasta…"
                {...register("categoria")}
              />
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
              {errors.prezzo_cents && (
                <p className="text-xs text-destructive">
                  {errors.prezzo_cents.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Descrizione (opzionale)</Label>
              <Input
                placeholder="Descrizione, ingredienti, note…"
                {...register("descrizione")}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label>Immagine prodotto</Label>
              <ImageUploader
                value={immagineUrl}
                onChange={(url) =>
                  setValue("immagine_url", url, { shouldDirty: true })
                }
                label="Carica una foto del prodotto"
              />
            </div>
            <label className="flex items-center gap-2 sm:col-span-3">
              <input
                type="checkbox"
                defaultChecked
                {...register("disponibile")}
              />
              <span className="text-sm">Disponibile in vendita</span>
            </label>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Annulla
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
              Aggiungi prodotto
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
