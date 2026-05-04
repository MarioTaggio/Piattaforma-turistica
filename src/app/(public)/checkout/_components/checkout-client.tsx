"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ShieldCheck, ShoppingBag } from "lucide-react";
import { Elements } from "@stripe/react-stripe-js";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/public/cart-context";
import { startCheckout } from "@/lib/checkout/actions";
import {
  PAYMENT_LABEL,
  SHIPPING_LABEL,
  computeTotals,
  type CheckoutInput,
} from "@/lib/checkout/schemas";
import { getStripe } from "@/lib/stripe/client";
import { formatEurFromCents } from "@/lib/utils/format";

import { CheckoutForm } from "./checkout-form";
import { PaymentForm } from "./payment-form";

type Phase =
  | { kind: "form" }
  | {
      kind: "pay";
      clientSecret: string;
      orderIds: string[];
      totalCents: number;
      checkout: CheckoutInput;
    };

type Props = {
  defaultEmail: string;
  defaultNome: string;
  defaultCognome: string;
};

const stripePromise = getStripe();

export function CheckoutClient({
  defaultEmail,
  defaultNome,
  defaultCognome,
}: Props) {
  const { items, count, totalCents: cartCents, clear } = useCart();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>({ kind: "form" });
  const [submitting, setSubmitting] = useState(false);

  const subtotal = cartCents;

  const summary = useMemo(() => {
    const metodo =
      phase.kind === "pay" ? phase.checkout.metodo_spedizione : "standard";
    return computeTotals({ subtotalCents: subtotal, metodo });
  }, [subtotal, phase]);

  if (count === 0 && phase.kind === "form") {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
        <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Il tuo carrello è vuoto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Aggiungi prodotti dal nostro shop per procedere al checkout.
        </p>
        <Button
          className="mt-6 rounded-xl bg-brand-600 hover:bg-brand-700"
          render={<Link href="/shop" />}
        >
          Vai allo shop
        </Button>
      </div>
    );
  }

  async function handleStart(input: CheckoutInput) {
    setSubmitting(true);
    try {
      const r = await startCheckout({
        lines: items.map((i) => ({
          id: i.id,
          shop_id: i.shop_id,
          qty: i.qty,
        })),
        checkout: input,
      });
      if ("error" in r) {
        toast.error(r.error);
        return;
      }
      if (r.mode === "alla_consegna") {
        // Nessun Stripe — l'ordine è già confermato come "alla consegna".
        clear();
        toast.success("Ordine confermato! Pagherai alla consegna.");
        router.push(`/checkout/success?orders=${r.orderIds.join(",")}`);
        return;
      }
      // Online: monta Stripe Elements con il clientSecret.
      if (!r.clientSecret) {
        toast.error("Errore creazione pagamento Stripe");
        return;
      }
      setPhase({
        kind: "pay",
        clientSecret: r.clientSecret,
        orderIds: r.orderIds,
        totalCents: r.totalCents,
        checkout: input,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        {phase.kind === "form" ? (
          <CheckoutForm
            defaultEmail={defaultEmail}
            defaultNome={defaultNome}
            defaultCognome={defaultCognome}
            onSubmit={handleStart}
            submitting={submitting}
          />
        ) : (
          <>
            <section className="rounded-2xl border border-border bg-card p-5">
              <header className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold">Dati confermati</h2>
                <button
                  type="button"
                  onClick={() => setPhase({ kind: "form" })}
                  className="text-xs font-medium text-brand-700 hover:underline"
                >
                  Modifica
                </button>
              </header>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Consegna
                  </dt>
                  <dd className="mt-1 text-foreground/80">
                    {phase.checkout.shipping.nome}{" "}
                    {phase.checkout.shipping.cognome}
                    <br />
                    {phase.checkout.shipping.indirizzo}
                    <br />
                    {phase.checkout.shipping.cap}{" "}
                    {phase.checkout.shipping.citta} (
                    {phase.checkout.shipping.provincia})
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Spedizione
                  </dt>
                  <dd className="mt-1 text-foreground/80">
                    {SHIPPING_LABEL[phase.checkout.metodo_spedizione]}
                  </dd>
                  <dt className="mt-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pagamento
                  </dt>
                  <dd className="mt-1 text-foreground/80">
                    {PAYMENT_LABEL[phase.checkout.metodo_pagamento]}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-2xl border border-border bg-card p-5">
              <header className="mb-4 flex items-center gap-2">
                <ShieldCheck className="size-4 text-brand-700" />
                <h2 className="text-base font-semibold">Pagamento sicuro</h2>
              </header>
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: phase.clientSecret,
                  appearance: { theme: "stripe" },
                }}
              >
                <PaymentForm
                  totalCents={phase.totalCents}
                  onPaid={() => clear()}
                />
              </Elements>
            </section>
          </>
        )}
      </div>

      <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
        <h3 className="text-base font-semibold">Riepilogo ordine</h3>

        <ul className="divide-y divide-border text-sm">
          {items.map((i) => (
            <li
              key={i.id}
              className="flex items-center justify-between gap-2 py-2"
            >
              <span className="min-w-0 flex-1 truncate">
                <span className="text-muted-foreground">{i.qty}×</span>{" "}
                {i.nome}
              </span>
              <span className="shrink-0 font-medium">
                {formatEurFromCents(i.prezzo_cents * i.qty)}
              </span>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotale</dt>
            <dd>{formatEurFromCents(summary.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Spedizione</dt>
            <dd>
              {summary.shippingCents === 0
                ? "Gratis"
                : formatEurFromCents(summary.shippingCents)}
            </dd>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <dt>di cui IVA (22%)</dt>
            <dd>{formatEurFromCents(summary.ivaCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Totale</dt>
            <dd>{formatEurFromCents(summary.totalCents)}</dd>
          </div>
        </dl>

        <p className="text-[11px] text-muted-foreground">
          Pagamenti gestiti da Stripe. I tuoi dati di pagamento non vengono mai
          memorizzati sui nostri server.
        </p>
      </aside>
    </div>
  );
}

// Re-export for the form to consume.
export type { CheckoutInput };
