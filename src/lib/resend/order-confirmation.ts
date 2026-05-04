import "server-only";

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
};

const SHIPPING_LABEL: Record<OrderEmail["shippingMethod"], string> = {
  standard: "Spedizione standard (3-5 gg)",
  express: "Spedizione express (1-2 gg)",
  ritiro: "Ritiro in punto vendita",
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
      <p style="margin:0;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em">Ordine confermato</p>
      <h1 style="margin:6px 0 0;font-size:22px">Grazie per il tuo ordine!</h1>
      <p style="margin:8px 0 0;color:#374151">Numero ordine: <strong>${escapeHtml(data.orderNumber)}</strong></p>
    </div>
    <div style="padding:20px 28px">
      <h2 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">Riepilogo</h2>
      <p style="margin:0 0 6px;color:#374151">Venduto da <strong>${escapeHtml(data.shopName)}</strong></p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;margin-top:8px">
        ${itemsHtml}
        <tr><td colspan="2" style="border-top:1px solid #e5e7eb;padding-top:12px"></td></tr>
        <tr><td style="padding:4px 0;color:#6b7280">Spedizione</td><td style="padding:4px 0;text-align:right">${escapeHtml(SHIPPING_LABEL[data.shippingMethod])}</td></tr>
        <tr><td style="padding:4px 0;font-weight:600">Totale pagato</td><td style="padding:4px 0;text-align:right;font-weight:600">${eur(data.totalCents)}</td></tr>
      </table>
    </div>
    <div style="padding:20px 28px;border-top:1px solid #e5e7eb">
      <h2 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:#6b7280">Indirizzo di consegna</h2>
      <p style="margin:0;color:#111827;line-height:1.5">
        ${escapeHtml(data.shippingAddress.nome)} ${escapeHtml(data.shippingAddress.cognome)}<br>
        ${escapeHtml(data.shippingAddress.indirizzo)}<br>
        ${escapeHtml(data.shippingAddress.cap)} ${escapeHtml(data.shippingAddress.citta)} (${escapeHtml(data.shippingAddress.provincia)})
      </p>
    </div>
    <div style="padding:18px 28px;background:#f9fafb;color:#6b7280;font-size:12px">
      Riceverai un altro avviso quando il tuo ordine sarà spedito.
    </div>
  </div>
</body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.to],
      subject: `Conferma ordine #${data.orderNumber}`,
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
