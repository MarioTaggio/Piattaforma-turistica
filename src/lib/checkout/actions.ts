"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { notifyGestoreNuovaPrenotazione } from "@/lib/notifications/booking-events";
import { sendOrderConfirmation } from "@/lib/resend/order-confirmation";
import { assertStripeConfigured, stripe } from "@/lib/stripe/server";

import {
  SHIPPING_COSTS_CENTS,
  checkoutSchema,
  computeTotals,
  type CheckoutInput,
} from "./schemas";

type CartLine = { id: string; shop_id: string; qty: number };

type StartCheckoutResult =
  | { error: string }
  | {
      mode: "online";
      orderIds: string[];
      clientSecret: string;
      paymentIntentId: string;
      totalCents: number;
    }
  | {
      mode: "alla_consegna";
      orderIds: string[];
      totalCents: number;
    };

/**
 * Crea uno (o più) ordini in stato `in_attesa` / pagamento `in_attesa` e un
 * unico PaymentIntent Stripe per il totale aggregato. Il webhook
 * `/api/stripe/webhook` aggiornerà lo stato a `pagato` quando Stripe conferma.
 *
 * Il PaymentIntent porta nei `metadata` la lista degli order id, così il
 * webhook può aggiornarli tutti.
 */
export async function startCheckout(input: {
  lines: CartLine[];
  checkout: CheckoutInput;
}): Promise<StartCheckoutResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Devi essere autenticato per ordinare" };

  const parsed = checkoutSchema.safeParse(input.checkout);
  if (!parsed.success) return { error: "Dati di checkout non validi" };
  if (input.lines.length === 0) return { error: "Carrello vuoto" };

  const c = parsed.data;
  if (c.metodo_pagamento === "online") assertStripeConfigured();

  const admin = createAdminClient();
  const ids = input.lines.map((l) => l.id);
  const { data: prods, error: pErr } = await admin
    .from("shop_prodotti")
    .select("id, prezzo_cents, shop_id, disponibile")
    .in("id", ids);
  if (pErr) return { error: pErr.message };

  const byId = new Map(
    ((prods ?? []) as {
      id: string;
      prezzo_cents: number;
      shop_id: string;
      disponibile: boolean;
    }[]).map((p) => [p.id, p]),
  );

  // Group lines by shop — un ordine per shop.
  const groups = new Map<string, CartLine[]>();
  for (const line of input.lines) {
    const p = byId.get(line.id);
    if (!p || !p.disponibile)
      return { error: "Alcuni prodotti non sono più disponibili" };
    const arr = groups.get(p.shop_id) ?? [];
    arr.push(line);
    groups.set(p.shop_id, arr);
  }

  // Crea gli ordini.
  const orderIds: string[] = [];
  let totalCents = 0;
  const billing = c.billing;

  for (const [shopId, lines] of groups) {
    const subtotal = lines.reduce(
      (s, l) => s + (byId.get(l.id)?.prezzo_cents ?? 0) * l.qty,
      0,
    );
    const totals = computeTotals({
      subtotalCents: subtotal,
      metodo: c.metodo_spedizione,
    });
    totalCents += totals.totalCents;

    const insertOrder: Record<string, unknown> = {
      shop_id: shopId,
      utente_id: user.id,
      totale_cents: totals.totalCents,
      stato: "in_attesa",
      stato_pagamento: "in_attesa",
      note: c.note?.trim() || null,

      shipping_nome: c.shipping.nome,
      shipping_cognome: c.shipping.cognome,
      shipping_indirizzo: c.shipping.indirizzo,
      shipping_citta: c.shipping.citta,
      shipping_cap: c.shipping.cap,
      shipping_provincia: c.shipping.provincia,
      shipping_telefono: c.shipping.telefono,
      shipping_email: c.shipping.email,

      billing_uguale: billing.uguale,
      metodo_spedizione: c.metodo_spedizione,
      metodo_pagamento: c.metodo_pagamento,
      costo_spedizione_cents: SHIPPING_COSTS_CENTS[c.metodo_spedizione],
      iva_cents: totals.ivaCents,
    };

    if (!billing.uguale) {
      insertOrder.billing_nome = billing.nome;
      insertOrder.billing_cognome = billing.cognome;
      insertOrder.billing_indirizzo = billing.indirizzo;
      insertOrder.billing_citta = billing.citta;
      insertOrder.billing_cap = billing.cap;
      insertOrder.billing_provincia = billing.provincia;
      insertOrder.billing_partita_iva = billing.partita_iva || null;
      insertOrder.billing_codice_fiscale = billing.codice_fiscale || null;
    }

    const { data: ord, error: oErr } = await admin
      .from("ordini_shop")
      .insert(insertOrder)
      .select("id")
      .single();
    if (oErr || !ord) return { error: oErr?.message ?? "Errore ordine" };
    const ordineId = (ord as { id: string }).id;
    orderIds.push(ordineId);

    const items = lines.map((l) => ({
      ordine_id: ordineId,
      prodotto_id: l.id,
      quantita: l.qty,
      prezzo_unitario_cents: byId.get(l.id)?.prezzo_cents ?? 0,
    }));
    const { error: iErr } = await admin
      .from("ordini_shop_prodotti")
      .insert(items);
    if (iErr) return { error: iErr.message };

    // Notifica al gestore dello shop.
    const { data: shopRow } = await admin
      .from("shops")
      .select("nome, gestore_id")
      .eq("id", shopId)
      .single();
    if (shopRow) {
      const sh = shopRow as { nome: string; gestore_id: string };
      await notifyGestoreNuovaPrenotazione({
        gestoreId: sh.gestore_id,
        modulo: "Shop",
        riferimento: `${sh.nome} — nuovo ordine #${ordineId.slice(0, 8).toUpperCase()}`,
        link: `/dashboard/shop/${shopId}/ordini`,
      });
    }
  }

  // Pagamento alla consegna: nessun PaymentIntent, ordine subito confermato
  // come "in_preparazione". Il pagamento avverrà a mano alla consegna.
  if (c.metodo_pagamento === "alla_consegna") {
    await admin
      .from("ordini_shop")
      .update({ stato: "in_preparazione" })
      .in("id", orderIds);

    // Invia email di conferma per ogni ordine (best-effort).
    const { data: confirmRows } = await admin
      .from("ordini_shop")
      .select(
        `id, totale_cents, metodo_spedizione,
         shipping_email, shipping_nome, shipping_cognome,
         shipping_indirizzo, shipping_citta, shipping_cap, shipping_provincia,
         shops:shop_id ( nome ),
         ordini_shop_prodotti ( quantita, prezzo_unitario_cents, shop_prodotti ( nome ) )`,
      )
      .in("id", orderIds);

    type ConfirmRow = {
      id: string;
      totale_cents: number;
      metodo_spedizione: "standard" | "express" | "ritiro";
      shipping_email: string | null;
      shipping_nome: string | null;
      shipping_cognome: string | null;
      shipping_indirizzo: string | null;
      shipping_citta: string | null;
      shipping_cap: string | null;
      shipping_provincia: string | null;
      shops: { nome: string } | null;
      ordini_shop_prodotti: Array<{
        quantita: number;
        prezzo_unitario_cents: number;
        shop_prodotti: { nome: string } | null;
      }>;
    };

    for (const o of (confirmRows ?? []) as unknown as ConfirmRow[]) {
      if (!o.shipping_email) continue;
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

    revalidatePath("/dashboard/ordini");
    return {
      mode: "alla_consegna",
      orderIds,
      totalCents,
    };
  }

  // Pagamento online: un solo PaymentIntent per tutto il checkout. Tutti i
  // metodi di pagamento abilitati nel dashboard Stripe (carta, Apple Pay,
  // Google Pay, PayPal, Klarna, ecc.) appariranno automaticamente.
  const intent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: "eur",
    automatic_payment_methods: { enabled: true },
    receipt_email: c.shipping.email,
    metadata: {
      order_ids: orderIds.join(","),
      utente_id: user.id,
    },
  });

  // Salva il payment_intent_id su tutti gli ordini.
  await admin
    .from("ordini_shop")
    .update({ stripe_payment_intent_id: intent.id })
    .in("id", orderIds);

  revalidatePath("/dashboard/ordini");

  return {
    mode: "online",
    orderIds,
    clientSecret: intent.client_secret ?? "",
    paymentIntentId: intent.id,
    totalCents,
  };
}
