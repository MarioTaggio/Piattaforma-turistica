"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotifica } from "@/lib/notifications/create";
import { sendBookingStateEmail } from "@/lib/resend/booking-state";
import {
  shopSchema,
  shopProdottoSchema,
  type ShopInput,
  type ShopProdottoInput,
} from "./shop-schemas";

type Result = { error: string } | { success: true; id: string };

function csvToArray(s: string | undefined): string[] {
  return (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function createShop(input: ShopInput): Promise<Result> {
  const parsed = shopSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  const v = parsed.data;
  const { data, error } = await supabase
    .from("shops")
    .insert({
      gestore_id: user.id,
      nome: v.nome,
      descrizione: v.descrizione || null,
      citta: v.citta || null,
      indirizzo: v.indirizzo || null,
      telefono: v.telefono || null,
      email: v.email || null,
      immagini: csvToArray(v.immagini),
      stato: v.stato,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/dashboard/shop");
  revalidatePath("/shop");
  return { success: true, id: (data as { id: string }).id };
}

export async function updateShop(
  id: string,
  input: ShopInput,
): Promise<Result> {
  const parsed = shopSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("shops")
    .update({
      nome: v.nome,
      descrizione: v.descrizione || null,
      citta: v.citta || null,
      indirizzo: v.indirizzo || null,
      telefono: v.telefono || null,
      email: v.email || null,
      immagini: csvToArray(v.immagini),
      stato: v.stato,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/dashboard/shop");
  revalidatePath(`/dashboard/shop/${id}`);
  revalidatePath("/shop");
  return { success: true, id };
}

export async function deleteShop(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("shops").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/shop");
  revalidatePath("/shop");
  return {};
}

export async function createShopProdotto(
  shopId: string,
  input: ShopProdottoInput,
): Promise<{ error?: string }> {
  const parsed = shopProdottoSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase.from("shop_prodotti").insert({
    shop_id: shopId,
    nome: v.nome,
    descrizione: v.descrizione || null,
    prezzo_cents: v.prezzo_cents,
    categoria: v.categoria || null,
    immagine_url: v.immagine_url || null,
    disponibile: v.disponibile,
  });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/shop/${shopId}`);
  revalidatePath("/shop");
  return {};
}

export async function updateShopProdotto(
  prodottoId: string,
  shopId: string,
  input: ShopProdottoInput,
): Promise<{ error?: string }> {
  const parsed = shopProdottoSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("shop_prodotti")
    .update({
      nome: v.nome,
      descrizione: v.descrizione || null,
      prezzo_cents: v.prezzo_cents,
      categoria: v.categoria || null,
      immagine_url: v.immagine_url || null,
      disponibile: v.disponibile,
    })
    .eq("id", prodottoId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/shop/${shopId}`);
  revalidatePath(`/dashboard/shop/${shopId}/prodotti/${prodottoId}`);
  revalidatePath("/shop");
  revalidatePath(`/shop/${prodottoId}`);
  return {};
}

export async function deleteShopProdotto(
  prodottoId: string,
  shopId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shop_prodotti")
    .delete()
    .eq("id", prodottoId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/shop/${shopId}`);
  revalidatePath("/shop");
  return {};
}

type OrdineStato =
  | "in_attesa"
  | "in_preparazione"
  | "pronto"
  | "consegnato"
  | "annullato";

const STATO_LABEL: Record<OrdineStato, string> = {
  in_attesa: "In attesa",
  in_preparazione: "In preparazione",
  pronto: "Pronto",
  consegnato: "Consegnato",
  annullato: "Annullato",
};

const STATO_VARIANTE: Record<
  OrdineStato,
  "successo" | "errore" | "info"
> = {
  in_attesa: "info",
  in_preparazione: "info",
  pronto: "successo",
  consegnato: "successo",
  annullato: "errore",
};

export async function updateOrdineShopStato(
  ordineId: string,
  shopId: string,
  stato: OrdineStato,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ordini_shop")
    .update({ stato })
    .eq("id", ordineId);
  if (error) return { error: error.message };

  await notifyOrdineUpdate(ordineId, stato);

  revalidatePath(`/dashboard/shop/${shopId}/ordini`);
  revalidatePath("/dashboard/ordini");
  return {};
}

export async function updateOrdineShopTracking(
  ordineId: string,
  shopId: string,
  tracking: { codice: string; url?: string },
): Promise<{ error?: string }> {
  const codice = tracking.codice.trim();
  if (!codice) return { error: "Inserisci il codice tracking" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("ordini_shop")
    .update({
      stato: "consegnato" as OrdineStato, // marca come spedito → in viaggio (mappato qui su 'consegnato' come ultimo step disponibile)
      tracking_codice: codice,
      tracking_url: tracking.url?.trim() || null,
    })
    .eq("id", ordineId);
  if (error) return { error: error.message };

  // Email + notifica con tracking
  const admin = createAdminClient();
  const { data } = await admin
    .from("ordini_shop")
    .select(
      "id, utente_id, shipping_email, shops:shop_id ( nome )",
    )
    .eq("id", ordineId)
    .single();
  const row = data as
    | {
        id: string;
        utente_id: string;
        shipping_email: string | null;
        shops: { nome: string } | null;
      }
    | null;

  if (row) {
    const orderNumber = row.id.slice(0, 8).toUpperCase();
    const shopName = row.shops?.nome ?? "Shop";

    await createNotifica({
      userId: row.utente_id,
      titolo: `Ordine ${orderNumber} spedito`,
      messaggio: `Codice tracking: ${codice}`,
      tipo: "successo",
      link: `/dashboard/ordini`,
    });

    if (row.shipping_email) {
      await sendBookingStateEmail({
        to: row.shipping_email,
        subject: `Il tuo ordine ${orderNumber} è in viaggio`,
        modulo: shopName,
        stato: "Spedito",
        variante: "successo",
        intro:
          "Buone notizie: il tuo ordine è stato consegnato al corriere e arriverà presto a destinazione.",
        dettagli: [
          { label: "Numero ordine", value: orderNumber },
          { label: "Codice tracking", value: codice },
        ],
        cta: tracking.url
          ? { label: "Traccia la spedizione", url: tracking.url }
          : undefined,
      });
    }
  }

  revalidatePath(`/dashboard/shop/${shopId}/ordini`);
  revalidatePath("/dashboard/ordini");
  return {};
}

type StatoPagamento = "in_attesa" | "pagato" | "fallito" | "rimborsato";
type MetodoSpedizione = "standard" | "express" | "ritiro";

/**
 * Full update di un ordine shop dal modal "Modifica":
 * stati, indirizzo spedizione, dati contatto cliente (shipping_*),
 * metodo/tracking spedizione, note interne. Se lo stato cambia,
 * dispatcha la notifica al cliente.
 */
export async function updateOrdineShopFull(
  ordineId: string,
  shopId: string,
  input: {
    stato: OrdineStato;
    statoPagamento: StatoPagamento;
    shippingNome: string;
    shippingCognome: string;
    shippingEmail: string;
    shippingTelefono?: string;
    shippingIndirizzo: string;
    shippingCitta: string;
    shippingCap: string;
    shippingProvincia: string;
    metodoSpedizione: MetodoSpedizione;
    trackingCodice?: string;
    trackingUrl?: string;
    note?: string;
  },
): Promise<{ error?: string }> {
  const admin = createAdminClient();

  // Stato precedente per decidere se notificare al cliente.
  const { data: prev } = await admin
    .from("ordini_shop")
    .select("stato")
    .eq("id", ordineId)
    .single();
  const prevStato = (prev as { stato: OrdineStato } | null)?.stato;

  const { error } = await admin
    .from("ordini_shop")
    .update({
      stato: input.stato,
      stato_pagamento: input.statoPagamento,
      shipping_nome: input.shippingNome.trim() || null,
      shipping_cognome: input.shippingCognome.trim() || null,
      shipping_email: input.shippingEmail.trim() || null,
      shipping_telefono: input.shippingTelefono?.trim() || null,
      shipping_indirizzo: input.shippingIndirizzo.trim() || null,
      shipping_citta: input.shippingCitta.trim() || null,
      shipping_cap: input.shippingCap.trim() || null,
      shipping_provincia: input.shippingProvincia.trim() || null,
      metodo_spedizione: input.metodoSpedizione,
      tracking_codice: input.trackingCodice?.trim() || null,
      tracking_url: input.trackingUrl?.trim() || null,
      note: input.note?.trim() || null,
    })
    .eq("id", ordineId);
  if (error) return { error: error.message };

  // Notifica solo se lo stato è cambiato.
  if (prevStato !== input.stato) {
    await notifyOrdineUpdate(ordineId, input.stato);
  }

  revalidatePath(`/dashboard/shop/${shopId}/ordini`);
  revalidatePath("/dashboard/ordini");
  return {};
}

/**
 * Ricalcola e persiste `totale_cents` come subtotale (Σ quantita *
 * prezzo_unitario) + iva + costo_spedizione. Usato dopo update/delete riga.
 */
async function recomputeOrdineShopTotal(ordineId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: items } = await admin
    .from("ordini_shop_prodotti")
    .select("quantita, prezzo_unitario_cents")
    .eq("ordine_id", ordineId);
  const subtotale = (
    (items ?? []) as { quantita: number; prezzo_unitario_cents: number }[]
  ).reduce((s, r) => s + r.quantita * r.prezzo_unitario_cents, 0);

  const { data: ord } = await admin
    .from("ordini_shop")
    .select("iva_cents, costo_spedizione_cents")
    .eq("id", ordineId)
    .single();
  const o = ord as
    | { iva_cents: number; costo_spedizione_cents: number }
    | null;
  const totale =
    subtotale + (o?.iva_cents ?? 0) + (o?.costo_spedizione_cents ?? 0);

  await admin
    .from("ordini_shop")
    .update({ totale_cents: totale })
    .eq("id", ordineId);
}

export async function updateOrdineShopItem(
  itemId: string,
  ordineId: string,
  shopId: string,
  quantita: number,
): Promise<{ error?: string }> {
  const n = Number(quantita);
  if (!Number.isFinite(n) || n < 1)
    return { error: "Quantità non valida (min 1)" };

  const admin = createAdminClient();
  const { error } = await admin
    .from("ordini_shop_prodotti")
    .update({ quantita: n })
    .eq("id", itemId)
    .eq("ordine_id", ordineId);
  if (error) return { error: error.message };

  await recomputeOrdineShopTotal(ordineId);
  revalidatePath(`/dashboard/shop/${shopId}/ordini`);
  return {};
}

export async function deleteOrdineShopItem(
  itemId: string,
  ordineId: string,
  shopId: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("ordini_shop_prodotti")
    .delete()
    .eq("id", itemId)
    .eq("ordine_id", ordineId);
  if (error) return { error: error.message };

  await recomputeOrdineShopTotal(ordineId);
  revalidatePath(`/dashboard/shop/${shopId}/ordini`);
  return {};
}

async function notifyOrdineUpdate(
  ordineId: string,
  stato: OrdineStato,
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("ordini_shop")
    .select(
      "id, utente_id, shipping_email, shops:shop_id ( nome )",
    )
    .eq("id", ordineId)
    .single();
  const row = data as
    | {
        id: string;
        utente_id: string;
        shipping_email: string | null;
        shops: { nome: string } | null;
      }
    | null;
  if (!row) return;

  const orderNumber = row.id.slice(0, 8).toUpperCase();
  const shopName = row.shops?.nome ?? "Shop";
  const stateLabel = STATO_LABEL[stato];

  await createNotifica({
    userId: row.utente_id,
    titolo: `Ordine ${orderNumber}: ${stateLabel.toLowerCase()}`,
    messaggio: `Aggiornamento da ${shopName}`,
    tipo: STATO_VARIANTE[stato],
    link: `/dashboard/ordini`,
  });

  if (row.shipping_email && (stato === "annullato" || stato === "pronto")) {
    await sendBookingStateEmail({
      to: row.shipping_email,
      subject: `Ordine ${orderNumber} ${stateLabel.toLowerCase()}`,
      modulo: shopName,
      stato: stateLabel,
      variante: STATO_VARIANTE[stato],
      intro:
        stato === "annullato"
          ? "Il tuo ordine è stato annullato. Se hai pagato online riceverai il rimborso entro pochi giorni."
          : "Il tuo ordine è pronto.",
      dettagli: [{ label: "Numero ordine", value: orderNumber }],
    });
  }
}
