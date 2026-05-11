import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { FROM_EMAIL, resend } from "./client";

/**
 * Notifica email al gestore quando un utente prenota o acquista un suo
 * contenuto. Si occupa di:
 *   1. recuperare email/nome del gestore dato il suo id;
 *   2. (opzionale) recuperare nome/email dell'acquirente dato il suo id;
 *   3. renderizzare e inviare l'email branded BorghiON.
 *
 * Se il gestore non ha email (raro: utenti con sola auth.users) l'invio
 * viene saltato silenziosamente — la notifica realtime resta comunque attiva.
 */

export type GestoreNotificationInput = {
  gestoreId: string;
  buyerId?: string | null;
  modulo: "Evento" | "B&B" | "Ristorante" | "Shop" | "Infopoint" | "Video";
  subject: string;
  // Riga in cima al box dettagli, es: "Nuova prenotazione" / "Nuovo ordine".
  evento: string;
  // Coppie label/value che compongono il box dettagli.
  dettagli: Array<{ label: string; value: string }>;
  // Url relativo verso la pagina di gestione (es. "/dashboard/eventi/..").
  ctaPath: string;
  // Override dell'acquirente (quando i dati sono già in mano al chiamante,
  // es. shop checkout con shipping_email/nome diversi dall'utente).
  buyerOverride?: { nome?: string | null; email?: string | null };
};

const BRAND = "#1B4332";

export async function sendGestoreNotificationEmail(
  input: GestoreNotificationInput,
): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn(
      `[gestore-email] RESEND_API_KEY mancante — salto invio "${input.subject}"`,
    );
    return { ok: false, error: "Resend non configurato" };
  }

  const admin = createAdminClient();

  // 1. email del gestore
  const { data: gestore } = await admin
    .from("users")
    .select("email, nome, cognome")
    .eq("id", input.gestoreId)
    .maybeSingle();
  const g = gestore as {
    email: string | null;
    nome: string | null;
    cognome: string | null;
  } | null;
  if (!g?.email) {
    return { ok: false, error: "Gestore senza email" };
  }

  // 2. dati acquirente (best-effort)
  let buyerName = input.buyerOverride?.nome ?? null;
  let buyerEmail = input.buyerOverride?.email ?? null;
  if (input.buyerId && (!buyerName || !buyerEmail)) {
    const { data: buyer } = await admin
      .from("users")
      .select("email, nome, cognome")
      .eq("id", input.buyerId)
      .maybeSingle();
    const b = buyer as {
      email: string | null;
      nome: string | null;
      cognome: string | null;
    } | null;
    if (b) {
      if (!buyerName) {
        const composed = [b.nome, b.cognome].filter(Boolean).join(" ").trim();
        buyerName = composed || b.email || null;
      }
      buyerEmail = buyerEmail ?? b.email ?? null;
    }
  }

  const buyerRows: Array<{ label: string; value: string }> = [];
  if (buyerName) buyerRows.push({ label: "Nome", value: buyerName });
  if (buyerEmail) buyerRows.push({ label: "Email", value: buyerEmail });

  const allRows = [...buyerRows, ...input.dettagli];

  const ctaUrl = absoluteUrl(input.ctaPath);
  const dashboardUrl = absoluteUrl("/dashboard");

  const html = render({
    subject: input.subject,
    modulo: input.modulo,
    evento: input.evento,
    rows: allRows,
    ctaUrl,
    dashboardUrl,
    gestoreNome: g.nome ?? null,
  });

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [g.email],
      subject: input.subject,
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

function absoluteUrl(path: string): string {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "");
  if (!base) return path;
  return path.startsWith("http") ? path : `${base}${path}`;
}

function render(input: {
  subject: string;
  modulo: string;
  evento: string;
  rows: Array<{ label: string; value: string }>;
  ctaUrl: string;
  dashboardUrl: string;
  gestoreNome: string | null;
}): string {
  const rowsHtml = input.rows
    .map(
      (r) =>
        `<tr><td style="padding:8px 0;color:#6b7280;width:40%;font-size:13px;vertical-align:top">${escapeHtml(
          r.label,
        )}</td><td style="padding:8px 0;color:#111827;font-size:14px">${escapeHtml(r.value)}</td></tr>`,
    )
    .join("");

  const greeting = input.gestoreNome
    ? `Ciao ${escapeHtml(input.gestoreNome)},`
    : "Ciao,";

  return `<!doctype html>
<html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f6f7f9;margin:0;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
    <!-- HEADER -->
    <div style="background:${BRAND};padding:24px 28px;color:#fff">
      <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;opacity:0.85">BorghiON · Dashboard gestore</p>
      <h1 style="margin:8px 0 0;font-size:22px;font-weight:600">${escapeHtml(input.evento)}</h1>
      <p style="margin:4px 0 0;font-size:13px;opacity:0.85">${escapeHtml(input.modulo)}</p>
    </div>

    <!-- BODY -->
    <div style="padding:24px 28px;color:#374151;font-size:14px;line-height:1.55">
      ${greeting}<br/>
      hai ricevuto una nuova attività sul tuo modulo <strong>${escapeHtml(input.modulo)}</strong>.
      Trovi qui sotto tutti i dettagli; clicca su "Gestisci ora" per aprire direttamente la dashboard.
    </div>

    <!-- DETAILS -->
    <div style="padding:0 28px 8px">
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e7eb">${rowsHtml}</table>
    </div>

    <!-- CTA -->
    <div style="padding:18px 28px 28px">
      <a href="${escapeHtml(input.ctaUrl)}"
         style="display:inline-block;background:${BRAND};color:#fff;border-radius:12px;padding:12px 22px;font-weight:600;font-size:14px;text-decoration:none">
        Gestisci ora →
      </a>
    </div>

    <!-- FOOTER -->
    <div style="padding:14px 28px;background:#f9fafb;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb">
      Ricevi questa email come gestore BorghiON.
      <a href="${escapeHtml(input.dashboardUrl)}" style="color:${BRAND};text-decoration:none">Apri la dashboard</a>
    </div>
  </div>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
