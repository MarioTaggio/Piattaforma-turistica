import "server-only";

import { getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

import { FROM_EMAIL, resend } from "./client";

type OrderEmail = {
  to: string;
  orderNumber: string;
  totalCents: number;
  shippingMethod: "standard" | "express" | "ritiro";
  shippingAddress: {
    nome: string;
    cognome: string;
    indirizzo: string;
    citta: string;
    cap: string;
    provincia: string;
  };
  items: Array<{ nome: string; quantita: number; prezzo_cents: number }>;
  shopName: string;
  // Locale del destinatario. Default IT.
  locale?: Locale;
};

function eur(cents: number): string {
  return `€ ${(cents / 100).toFixed(2)}`;
}

export async function sendOrderConfirmation(
  data: OrderEmail,
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn(
      "[email] RESEND_API_KEY mancante — salto invio email conferma ordine",
      data.orderNumber,
    );
    return { ok: false, error: "Resend non configurato" };
  }

  const t = await getTranslations({
    locale: data.locale ?? DEFAULT_LOCALE,
    namespace: "emails",
  });
  const shippingLabel = t(`shipping_${data.shippingMethod}`);

  const itemsHtml = data.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${i.quantita}× ${escapeHtml(i.nome)}</td><td style="padding:6px 0;text-align:right">${eur(i.prezzo_cents * i.quantita)}</td></tr>`,
    )
    .join("");

  const html = `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f7f9;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:24px 28px;border-bottom:1px solid #e5e7eb">
      <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em">${escapeHtml(t("orderConfirmed"))}</p>
      <h1 style="margin:6px 0 0;font-size:22px">${escapeHtml(t("thankYou"))}</h1>
      <p style="margin:8px 0 0;color:#374151">${escapeHtml(t("orderNumber"))}: <strong>${escapeHtml(data.orderNumber)}</strong></p>
    </div>
    <div style="padding:20px 28px">
      <h2 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">${escapeHtml(t("summary"))}</h2>
      <p style="margin:0 0 6px;color:#374151">${escapeHtml(t("soldBy"))} <strong>${escapeHtml(data.shopName)}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
        ${itemsHtml}
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:12px"></td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">${escapeHtml(t("shipping"))}</td><td style="padding:4px 0;text-align:right">${escapeHtml(shippingLabel)}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600">${escapeHtml(t("totalPaid"))}</td><td style="padding:4px 0;text-align:right;font-weight:600">${eur(data.totalCents)}</td></tr>
      </table>
    </div>
    <div style="padding:20px 28px;border-top:1px solid #e5e7eb">
      <h2 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">${escapeHtml(t("deliveryAddress"))}</h2>
      <p style="margin:0;color:#111827;line-height:1.5">
        ${escapeHtml(data.shippingAddress.nome)} ${escapeHtml(data.shippingAddress.cognome)}<br>
        ${escapeHtml(data.shippingAddress.indirizzo)}<br>
        ${escapeHtml(data.shippingAddress.cap)} ${escapeHtml(data.shippingAddress.citta)} (${escapeHtml(data.shippingAddress.provincia)})
      </p>
    </div>
    <div style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px">
      ${escapeHtml(t("shipNotification"))}
    </div>
  </div>
</body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.to],
      subject: `${t("orderConfirmationSubject")} #${data.orderNumber}`,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Errore invio" };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
