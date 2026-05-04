"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreditCard,
  HandCoins,
  Loader2,
  Package,
  Store,
  Truck,
} from "lucide-react";
import type { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  SHIPPING_COSTS_CENTS,
  checkoutSchema,
  type CheckoutInput,
} from "@/lib/checkout/schemas";
import { formatEurFromCents } from "@/lib/utils/format";

type ShippingMethod = "standard" | "express" | "ritiro";

const METODI: Array<{
  value: ShippingMethod;
  label: string;
  eta: string;
  icon: typeof Truck;
}> = [
  {
    value: "standard",
    label: "Spedizione standard",
    eta: "3-5 giorni lavorativi",
    icon: Package,
  },
  {
    value: "express",
    label: "Spedizione express",
    eta: "1-2 giorni lavorativi",
    icon: Truck,
  },
  {
    value: "ritiro",
    label: "Ritiro in punto vendita",
    eta: "Disponibile entro 24h",
    icon: Store,
  },
];

type Props = {
  defaultEmail: string;
  defaultNome: string;
  defaultCognome: string;
  onSubmit: (values: CheckoutInput) => void | Promise<void>;
  submitting: boolean;
};

export function CheckoutForm({
  defaultEmail,
  defaultNome,
  defaultCognome,
  onSubmit,
  submitting,
}: Props) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<z.input<typeof checkoutSchema>, unknown, CheckoutInput>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shipping: {
        nome: defaultNome,
        cognome: defaultCognome,
        indirizzo: "",
        citta: "",
        cap: "",
        provincia: "",
        telefono: "",
        email: defaultEmail,
      },
      billing: { uguale: true },
      metodo_spedizione: "standard",
      metodo_pagamento: "online",
      note: "",
    } as z.input<typeof checkoutSchema>,
  });

  const billingUguale = watch("billing.uguale") as unknown as boolean;
  const metodo = watch("metodo_spedizione") as ShippingMethod;
  const pagamento = watch("metodo_pagamento") as "online" | "alla_consegna";
  const shippingErrors = errors.shipping;
  const billingErrors =
    errors.billing as Record<string, { message?: string } | undefined> | undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* ───────── Consegna ───────── */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Indirizzo di consegna</h2>
        <p className="text-xs text-muted-foreground">
          Dove spediamo il tuo ordine.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="Nome" error={shippingErrors?.nome?.message}>
            <Input {...register("shipping.nome")} />
          </Field>
          <Field label="Cognome" error={shippingErrors?.cognome?.message}>
            <Input {...register("shipping.cognome")} />
          </Field>
          <Field
            label="Indirizzo"
            full
            error={shippingErrors?.indirizzo?.message}
          >
            <Input
              placeholder="Via, numero civico"
              {...register("shipping.indirizzo")}
            />
          </Field>
          <Field label="Città" error={shippingErrors?.citta?.message}>
            <Input {...register("shipping.citta")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="CAP" error={shippingErrors?.cap?.message}>
              <Input
                placeholder="00100"
                inputMode="numeric"
                {...register("shipping.cap")}
              />
            </Field>
            <Field
              label="Provincia"
              error={shippingErrors?.provincia?.message}
            >
              <Input
                placeholder="RM"
                maxLength={2}
                {...register("shipping.provincia")}
              />
            </Field>
          </div>
          <Field label="Telefono" error={shippingErrors?.telefono?.message}>
            <Input
              placeholder="+39 333 1234567"
              {...register("shipping.telefono")}
            />
          </Field>
          <Field label="Email" error={shippingErrors?.email?.message}>
            <Input
              type="email"
              {...register("shipping.email")}
            />
          </Field>
        </div>
      </section>

      {/* ───────── Fatturazione ───────── */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Fatturazione</h2>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={billingUguale}
            onChange={(e) => {
              const checked = e.target.checked;
              if (checked) {
                setValue("billing", { uguale: true });
              } else {
                setValue("billing", {
                  uguale: false,
                  nome: "",
                  cognome: "",
                  indirizzo: "",
                  citta: "",
                  cap: "",
                  provincia: "",
                  partita_iva: "",
                  codice_fiscale: "",
                });
              }
            }}
          />
          <span>Stessi dati della consegna</span>
        </label>

        {!billingUguale && (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Nome / Ragione sociale" error={billingErrors?.nome?.message}>
              <Input {...register("billing.nome")} />
            </Field>
            <Field label="Cognome" error={billingErrors?.cognome?.message}>
              <Input {...register("billing.cognome")} />
            </Field>
            <Field label="Indirizzo" full error={billingErrors?.indirizzo?.message}>
              <Input {...register("billing.indirizzo")} />
            </Field>
            <Field label="Città" error={billingErrors?.citta?.message}>
              <Input {...register("billing.citta")} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CAP" error={billingErrors?.cap?.message}>
                <Input inputMode="numeric" {...register("billing.cap")} />
              </Field>
              <Field label="Provincia" error={billingErrors?.provincia?.message}>
                <Input maxLength={2} {...register("billing.provincia")} />
              </Field>
            </div>
            <Field
              label="Partita IVA (per fattura)"
              error={billingErrors?.partita_iva?.message}
            >
              <Input
                placeholder="12345678901"
                inputMode="numeric"
                {...register("billing.partita_iva")}
              />
            </Field>
            <Field
              label="Codice Fiscale"
              error={billingErrors?.codice_fiscale?.message}
            >
              <Input {...register("billing.codice_fiscale")} />
            </Field>
          </div>
        )}
      </section>

      {/* ───────── Spedizione ───────── */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Metodo di spedizione</h2>
        <div className="mt-3 grid gap-2">
          {METODI.map((m) => {
            const checked = metodo === m.value;
            const Icon = m.icon;
            return (
              <label
                key={m.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  checked
                    ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <input
                  type="radio"
                  value={m.value}
                  checked={checked}
                  onChange={() => setValue("metodo_spedizione", m.value)}
                  className="sr-only"
                />
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-foreground">
                  <Icon className="size-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.eta}</p>
                </div>
                <span className="text-sm font-semibold">
                  {SHIPPING_COSTS_CENTS[m.value] === 0
                    ? "Gratis"
                    : formatEurFromCents(SHIPPING_COSTS_CENTS[m.value])}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* ───────── Metodo pagamento ───────── */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Metodo di pagamento</h2>
        <div className="mt-3 grid gap-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              pagamento === "online"
                ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <input
              type="radio"
              value="online"
              checked={pagamento === "online"}
              onChange={() => setValue("metodo_pagamento", "online")}
              className="sr-only"
            />
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
              <CreditCard className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">Paga online ora</p>
              <p className="text-xs text-muted-foreground">
                Carta di credito/debito, Apple Pay, Google Pay, PayPal e altri
                metodi sicuri tramite Stripe.
              </p>
            </div>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
              pagamento === "alla_consegna"
                ? "border-brand-600 bg-brand-50/50 ring-1 ring-brand-600"
                : "border-border hover:bg-muted/40"
            }`}
          >
            <input
              type="radio"
              value="alla_consegna"
              checked={pagamento === "alla_consegna"}
              onChange={() => setValue("metodo_pagamento", "alla_consegna")}
              className="sr-only"
            />
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
              <HandCoins className="size-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-medium">Pagamento alla consegna</p>
              <p className="text-xs text-muted-foreground">
                {metodo === "ritiro"
                  ? "Paghi in contanti o con bancomat al ritiro nel punto vendita."
                  : "Paghi in contanti o con bancomat direttamente al corriere."}
              </p>
            </div>
          </label>
        </div>
      </section>

      {/* ───────── Note ───────── */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Note (opzionale)</h2>
        <textarea
          rows={3}
          {...register("note")}
          placeholder="Istruzioni per il corriere, citofono, orario preferito…"
          className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </section>

      <Button
        type="submit"
        size="lg"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
      >
        {submitting && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        {pagamento === "alla_consegna"
          ? "Conferma ordine"
          : "Vai al pagamento"}
      </Button>
    </form>
  );
}

function Field({
  label,
  error,
  full,
  children,
}: {
  label: string;
  error?: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
