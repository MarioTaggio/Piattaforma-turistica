import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";

export function isResendConfigured(): boolean {
  return resend !== null && !!process.env.RESEND_FROM_EMAIL;
}

/**
 * Trasforma un path relativo (es. "/dashboard/prenotazioni") in URL assoluto.
 * Se è già assoluto (http/https) lo restituisce invariato. Fallback a
 * borghion.it se nessuna env var del sito è configurata, così le email
 * non finiscono mai con link tipo "http:///dashboard/..." quando lette
 * fuori dal contesto del sito.
 */
export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://borghion.it"
  ).replace(/\/$/, "");
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
