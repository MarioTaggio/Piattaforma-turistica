import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2,
  HandCoins,
  MapPin,
  Package,
  Receipt,
  ShoppingBag,
  Truck,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { Button } from "@/components/ui/button";
import { formatEurFromCents } from "@/lib/utils/format";
import {
  SHIPPING_ETA_DAYS,
  SHIPPING_LABEL,
} from "@/lib/checkout/schemas";

import { ClearCart } from "./_clear-cart";

export const metadata: Metadata = {
  title: "Ordine confermato — Piattaforma Turistica",
};

type SearchParams = Promise<{
  payment_intent?: string;
  redirect_status?: string;
  orders?: string;
}>;

type Row = {
  id: string;
  totale_cents: number;
  metodo_spedizione: "standard" | "express" | "ritiro";
  metodo_pagamento: "online" | "alla_consegna";
  costo_spedizione_cents: number;
  iva_cents: number;
  shipping_nome: string | null;
  shipping_cognome: string | null;
  shipping_indirizzo: string | null;
  shipping_citta: string | null;
  shipping_cap: string | null;
  shipping_provincia: string | null;
  shops: { nome: string } | null;
  ordini_shop_prodotti: Array<{
    id: string;
    quantita: number;
    prezzo_unitario_cents: number;
    shop_prodotti: { nome: string } | null;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const intentId = sp.payment_intent;
  const codOrderIds = sp.orders
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!intentId && (!codOrderIds || codOrderIds.length === 0)) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">Sessione mancante</h1>
        <p className="mt-2 text-muted-foreground">
          Non riusciamo a trovare un ordine associato a questa pagina.
        </p>
        <Button render={<Link href="/shop" />} className="mt-6 rounded-xl">
          Torna allo shop
        </Button>
      </div>
    );
  }

  // Per il flusso online verifichiamo lo stato direttamente da Stripe.
  let paid = false;
  let processing = false;
  if (intentId) {
    try {
      const intent = await stripe.paymentIntents.retrieve(intentId);
      paid = intent.status === "succeeded";
      processing = intent.status === "processing";
    } catch {
      // ignore — handled below
    }
  }

  // Carica gli ordini collegati a questo intent o agli order id COD.
  const admin = createAdminClient();
  const baseSelect = `id, totale_cents, metodo_spedizione, metodo_pagamento,
       costo_spedizione_cents, iva_cents,
       shipping_nome, shipping_cognome, shipping_indirizzo,
       shipping_citta, shipping_cap, shipping_provincia,
       shops:shop_id ( nome ),
       ordini_shop_prodotti ( id, quantita, prezzo_unitario_cents, shop_prodotti ( nome ) )`;

  const { data: ordini } = intentId
    ? await admin
        .from("ordini_shop")
        .select(baseSelect)
        .eq("stripe_payment_intent_id", intentId)
        .order("created_at", { ascending: true })
    : await admin
        .from("ordini_shop")
        .select(baseSelect)
        .in("id", codOrderIds ?? [])
        .order("created_at", { ascending: true });

  const rows = (ordini ?? []) as unknown as Row[];

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center sm:px-6">
        <h1 className="text-2xl font-semibold">Ordine non trovato</h1>
        <p className="mt-2 text-muted-foreground">
          Non riusciamo a trovare l&apos;ordine collegato a questo pagamento.
          Se l&apos;addebito è andato a buon fine, lo troverai a breve nella tua
          area &laquo;I miei ordini&raquo;.
        </p>
        <Button
          render={<Link href="/dashboard/ordini" />}
          className="mt-6 rounded-xl bg-brand-600 hover:bg-brand-700"
        >
          Vai ai miei ordini
        </Button>
      </div>
    );
  }

  const first = rows[0]!;
  const orderNumber = first.id.slice(0, 8).toUpperCase();
  const isCod = first.metodo_pagamento === "alla_consegna";

  let title: string;
  let subtitle: string;
  if (isCod) {
    title = "Ordine confermato!";
    subtitle =
      first.metodo_spedizione === "ritiro"
        ? "Pagherai al ritiro nel punto vendita."
        : "Pagherai in contanti o con bancomat al corriere alla consegna.";
  } else if (paid) {
    title = "Ordine confermato!";
    subtitle = "Grazie! Riceverai una email di conferma all'indirizzo indicato.";
  } else if (processing) {
    title = "Pagamento in elaborazione…";
    subtitle =
      "Stiamo confermando il tuo pagamento. Aggiornerai lo stato dalla pagina ordini.";
  } else {
    title = "Ordine ricevuto";
    subtitle = "Aggiornerai lo stato dalla pagina ordini.";
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <ClearCart />
      <header className="text-center">
        <span
          className={`mx-auto grid size-14 place-items-center rounded-full ${
            isCod
              ? "bg-amber-100 text-amber-700"
              : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {isCod ? (
            <HandCoins className="size-7" />
          ) : (
            <CheckCircle2 className="size-7" />
          )}
        </span>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs">
          <Receipt className="size-3.5" />
          Numero ordine{" "}
          <strong className="font-semibold">{orderNumber}</strong>
        </p>
      </header>

      <div className="mt-10 space-y-6">
        {rows.map((o) => (
          <article
            key={o.id}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <header className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Venduto da
                </p>
                <h2 className="text-lg font-semibold">
                  {o.shops?.nome ?? "Shop"}
                </h2>
              </div>
              <span className="text-base font-semibold">
                {formatEurFromCents(o.totale_cents)}
              </span>
            </header>

            <ul className="divide-y divide-border text-sm">
              {o.ordini_shop_prodotti.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center justify-between py-2"
                >
                  <span>
                    <span className="text-muted-foreground">{r.quantita}×</span>{" "}
                    {r.shop_prodotti?.nome ?? "Prodotto"}
                  </span>
                  <span className="text-muted-foreground">
                    {formatEurFromCents(
                      r.prezzo_unitario_cents * r.quantita,
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              <div className="flex items-start gap-2.5 text-sm">
                <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Indirizzo di consegna
                  </p>
                  <p className="mt-1 text-foreground/80">
                    {o.shipping_nome} {o.shipping_cognome}
                    <br />
                    {o.shipping_indirizzo}
                    <br />
                    {o.shipping_cap} {o.shipping_citta} ({o.shipping_provincia})
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5 text-sm">
                {o.metodo_spedizione === "ritiro" ? (
                  <Package className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Truck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                )}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Spedizione
                  </p>
                  <p className="mt-1 text-foreground/80">
                    {SHIPPING_LABEL[o.metodo_spedizione]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Tempo stimato: {SHIPPING_ETA_DAYS[o.metodo_spedizione]}
                  </p>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
        <Button
          size="lg"
          render={<Link href="/dashboard/ordini" />}
          className="rounded-xl bg-brand-600 hover:bg-brand-700"
        >
          Vai ai miei ordini
        </Button>
        <Button
          variant="outline"
          size="lg"
          render={<Link href="/shop" />}
          className="rounded-xl"
        >
          <ShoppingBag className="mr-1.5 size-4" />
          Continua lo shopping
        </Button>
      </div>
    </div>
  );
}
