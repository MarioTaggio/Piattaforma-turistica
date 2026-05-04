import "server-only";
import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ?? "noreply@example.com";

export function isResendConfigured(): boolean {
  return resend !== null && !!process.env.RESEND_FROM_EMAIL;
}
