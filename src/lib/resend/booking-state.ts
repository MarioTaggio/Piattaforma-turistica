import "server-only";

import { getTranslations } from "next-intl/server";

import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

import { absoluteUrl, FROM_EMAIL, resend } from "./client";

type BookingStateEmail = {
  to: string;
  subject: string;
  // Modulo di riferimento (B&B, Ristorante, Visita, Evento, Ordine).
  modulo: string;
  // Stato umano: "Confermata", "Rifiutata", "Spedito", "Validato", ecc.
  stato: string;
  // Variante visuale: "successo" verde, "errore" rosso, "info" neutra.
  variante?: "successo" | "errore" | "info";
  intro: string;
  // Coppie key/value mostrate come tabella (es. "Data": "15/05/2026").
  dettagli?: Array<{ label: string; value: string }>;
  // Eventuale CTA cliccabile in fondo alla mail.
  cta?: { label: string; url: string };
  // Nota libera (es. motivazione del rifiuto).
  note?: string;
  // Locale del destinatario. Usato solo per il footer e label nota:
  // i contenuti (subject/intro/stato) sono già preparati dal chiamante.
  locale?: Locale;
};

const COLOR: Record<NonNullable<BookingStateEmail["variante"]>, string> = {
  successo: "#10b981",
  errore: "#ef4444",
  info: "#0ea5e9",
};

export async function sendBookingStateEmail(
  data: BookingStateEmail,
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn(
      `[email] RESEND_API_KEY mancante — salto invio "${data.subject}" → ${data.to}`,
    );
    return { ok: false, error: "Resend non configurato" };
  }

  const accent = COLOR[data.variante ?? "info"];

  // Carica una piccola slice di traduzioni per i label fissi del template
  // (footer e prefisso nota). Il resto del contenuto è già localizzato dal
  // chiamante (subject/intro/stato/labels della tabella).
  const tEmails = await getTranslations({
    locale: data.locale ?? DEFAULT_LOCALE,
    namespace: "emails",
  });
  const tCommon = await getTranslations({
    locale: data.locale ?? DEFAULT_LOCALE,
    namespace: "booking",
  });
  // "Nota" come label: riusiamo booking.notes per coerenza
  const noteLabel = tCommon("notes");
  const footerText = tEmails("footer");

  const detailsHtml = (data.dettagli ?? [])
    .map(
      (d) =>
        `<tr><td style="padding:6px 0;color:#6b7280;width:40%">${escapeHtml(d.label)}</td><td style="padding:6px 0;color:#111827">${escapeHtml(d.value)}</td></tr>`,
    )
    .join("");

  const ctaHtml = data.cta
    ? `<div style="padding:0 28px 28px"><a href="${escapeHtml(absoluteUrl(data.cta.url))}" style="display:inline-block;background:#1B4332;color:#fff;border-radius:12px;padding:10px 18px;font-weight:600;font-size:14px;text-decoration:none">${escapeHtml(data.cta.label)}</a></div>`
    : "";

  const noteHtml = data.note
    ? `<div style="padding:14px 28px 0;color:#374151;font-size:14px"><strong>${escapeHtml(noteLabel)}:</strong> ${escapeHtml(data.note)}</div>`
    : "";

  const html = `
<!doctype html>
<html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f7f9;margin:0;padding:24px">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="padding:20px 28px;border-bottom:1px solid #e5e7eb;border-left:4px solid ${accent}">
      <p style="margin:0;font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:0.08em">${escapeHtml(data.modulo)} • ${escapeHtml(data.stato)}</p>
      <h1 style="margin:6px 0 0;font-size:20px;color:#111827">${escapeHtml(data.subject)}</h1>
    </div>
    <div style="padding:20px 28px;color:#374151;font-size:14px;line-height:1.55">
      ${escapeHtml(data.intro)}
    </div>
    ${
      detailsHtml
        ? `<div style="padding:0 28px 18px"><table style="width:100%;border-collapse:collapse;font-size:14px;border-top:1px solid #e5e7eb">${detailsHtml}</table></div>`
        : ""
    }
    ${noteHtml}
    ${ctaHtml}
    <div style="padding:14px 28px;background:#f9fafb;color:#6b7280;font-size:12px">
      ${escapeHtml(footerText)}
    </div>
  </div>
</body></html>`;

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [data.to],
      subject: data.subject,
      html,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Errore invio",
    };
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
