import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import { sendOrderConfirmation } from "@/lib/resend/order-confirmation";
import { sendGestoreNotificationEmail } from "@/lib/resend/gestore-notification";

const eurFmt = (cents: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    (cents ?? 0) / 100,
  );

const SHIPPING_LABEL: Record<"standard" | "express" | "ritiro", string> = {
  standard: "Spedizione standard",
  express: "Spedizione express",
  ritiro: "Ritiro in negozio",
};

export const runtime = "nodejs";
// Stripe webhooks need the raw body for signature verification.
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json(
      { error: "Stripe webhook secret non configurato" },
      { status: 400 },
    );
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "invalid signature";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      await handlePaymentSucceeded(event.data.object);
    } else if (event.type === "payment_intent.payment_failed") {
      await handlePaymentFailed(event.data.object);
    }
  } catch (err) {
    console.error("[stripe webhook] handler error", err);
    return NextResponse.json({ error: "handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(intent: Stripe.PaymentIntent) {
  const orderIds = (intent.metadata?.order_ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (orderIds.length === 0) return;

  const admin = createAdminClient();

  await admin
    .from("ordini_shop")
    .update({
      stato_pagamento: "pagato",
      stato: "in_preparazione",
    })
    .in("id", orderIds);

  // Invia email di conferma per ogni ordine.
  const { data: ordini } = await admin
    .from("ordini_shop")
    .select(
      `id, shop_id, utente_id, totale_cents, metodo_spedizione,
       shipping_email, shipping_nome, shipping_cognome,
       shipping_indirizzo, shipping_citta, shipping_cap, shipping_provincia,
       shops:shop_id ( nome, gestore_id ),
       ordini_shop_prodotti ( quantita, prezzo_unitario_cents, shop_prodotti ( nome ) )`,
    )
    .in("id", orderIds);

  type Row = {
    id: string;
    shop_id: string;
    utente_id: string;
    totale_cents: number;
    metodo_spedizione: "standard" | "express" | "ritiro";
    shipping_email: string | null;
    shipping_nome: string | null;
    shipping_cognome: string | null;
    shipping_indirizzo: string | null;
    shipping_citta: string | null;
    shipping_cap: string | null;
    shipping_provincia: string | null;
    shops: { nome: string; gestore_id: string } | null;
    ordini_shop_prodotti: Array<{
      quantita: number;
      prezzo_unitario_cents: number;
      shop_prodotti: { nome: string } | null;
    }>;
  };

  for (const o of (ordini ?? []) as unknown as Row[]) {
    if (o.shipping_email) {
      await sendOrderConfirmation({
        to: o.shipping_email,
        orderNumber: o.id.slice(0, 8).toUpperCase(),
        totalCents: o.totale_cents,
        shippingMethod: o.metodo_spedizione,
        shippingAddress: {
          nome: o.shipping_nome ?? "",
          cognome: o.shipping_cognome ?? "",
          indirizzo: o.shipping_indirizzo ?? "",
          citta: o.shipping_citta ?? "",
          cap: o.shipping_cap ?? "",
          provincia: o.shipping_provincia ?? "",
        },
        items: o.ordini_shop_prodotti.map((r) => ({
          nome: r.shop_prodotti?.nome ?? "Prodotto",
          quantita: r.quantita,
          prezzo_cents: r.prezzo_unitario_cents,
        })),
        shopName: o.shops?.nome ?? "Shop",
      });
    }

    // Email al gestore dello shop.
    if (o.shops?.gestore_id) {
      const buyerName = [o.shipping_nome, o.shipping_cognome]
        .filter(Boolean)
        .join(" ")
        .trim();
      const shippingAddr = [
        o.shipping_indirizzo,
        o.shipping_cap,
        o.shipping_citta,
        o.shipping_provincia,
      ]
        .filter(Boolean)
        .join(", ");

      const itemsText = o.ordini_shop_prodotti
        .map(
          (r) =>
            `${r.quantita}× ${r.shop_prodotti?.nome ?? "Prodotto"} — ${eurFmt(r.prezzo_unitario_cents * r.quantita)}`,
        )
        .join("\n");

      await sendGestoreNotificationEmail({
        gestoreId: o.shops.gestore_id,
        buyerId: o.utente_id,
        buyerOverride: {
          nome: buyerName || null,
          email: o.shipping_email,
        },
        modulo: "Shop",
        subject: `Nuovo ordine ricevuto — ${o.shops.nome}`,
        evento: "Nuovo ordine ricevuto",
        ctaPath: `/dashboard/shop/${o.shop_id}/ordini`,
        dettagli: [
          { label: "Shop", value: o.shops.nome },
          { label: "Numero ordine", value: o.id.slice(0, 8).toUpperCase() },
          ...(shippingAddr
            ? [{ label: "Indirizzo spedizione", value: shippingAddr }]
            : []),
          {
            label: "Metodo spedizione",
            value:
              SHIPPING_LABEL[o.metodo_spedizione] ?? o.metodo_spedizione,
          },
          { label: "Prodotti", value: itemsText || "—" },
          { label: "Totale", value: eurFmt(o.totale_cents) },
        ],
      });
    }
  }
}

async function handlePaymentFailed(intent: Stripe.PaymentIntent) {
  const orderIds = (intent.metadata?.order_ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (orderIds.length === 0) return;

  const admin = createAdminClient();
  await admin
    .from("ordini_shop")
    .update({ stato_pagamento: "fallito" })
    .in("id", orderIds);
}
