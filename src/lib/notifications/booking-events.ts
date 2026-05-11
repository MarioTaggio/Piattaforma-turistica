import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendBookingStateEmail } from "@/lib/resend/booking-state";

import { createNotifica } from "./create";

type BookingEvent = {
  // Modulo per UX (es. "B&B", "Ristorante", "Visita guidata")
  modulo: string;
  // Stato finale ("Confermata", "Cancellata", ecc.)
  stato: "confermata" | "cancellata" | "completata" | "no_show";
  // Utente destinatario notifica/email
  userId: string;
  email?: string | null;
  // Riferimento umano (es. nome struttura/ristorante/attrazione)
  riferimento: string;
  // Quando (datetime ISO o stringa già formattata, opzionale)
  quando?: string;
  // Link in-app
  link: string;
  // Eventuale motivazione (es. rifiuto)
  note?: string;
};

const STATO_LABEL: Record<BookingEvent["stato"], string> = {
  confermata: "Confermata",
  cancellata: "Annullata",
  completata: "Completata",
  no_show: "No show",
};

const STATO_TIPO: Record<
  BookingEvent["stato"],
  "successo" | "errore" | "info"
> = {
  confermata: "successo",
  cancellata: "errore",
  completata: "info",
  no_show: "info",
};

const STATO_INTRO: Record<BookingEvent["stato"], string> = {
  confermata:
    "La tua prenotazione è stata accettata. Ti aspettiamo!",
  cancellata:
    "Purtroppo la tua prenotazione non è stata accettata. Se hai pagato online riceverai il rimborso entro pochi giorni.",
  completata:
    "La tua prenotazione si è conclusa. Grazie per aver scelto la nostra struttura!",
  no_show:
    "Risulta che non hai partecipato. Se ritieni si tratti di un errore, contatta direttamente la struttura.",
};

/**
 * Notifica + email per cambio stato di una prenotazione (B&B, ristorante,
 * visita guidata). Best-effort: non solleva eccezioni.
 */
export async function notifyBookingStateChange(e: BookingEvent): Promise<void> {
  const stateLabel = STATO_LABEL[e.stato];

  await createNotifica({
    userId: e.userId,
    titolo: `${e.modulo}: ${stateLabel.toLowerCase()}`,
    messaggio: e.riferimento,
    tipo: STATO_TIPO[e.stato],
    link: e.link,
  });

  if (
    e.email &&
    (e.stato === "confermata" || e.stato === "cancellata")
  ) {
    const dettagli: { label: string; value: string }[] = [
      { label: "Riferimento", value: e.riferimento },
    ];
    if (e.quando) dettagli.push({ label: "Quando", value: e.quando });

    await sendBookingStateEmail({
      to: e.email,
      subject: `Prenotazione ${stateLabel.toLowerCase()}: ${e.riferimento}`,
      modulo: e.modulo,
      stato: stateLabel,
      variante: STATO_TIPO[e.stato],
      intro: STATO_INTRO[e.stato],
      dettagli,
      cta: { label: "Apri prenotazione", url: e.link },
      note: e.note,
    });
  }
}

/**
 * Notifica al gestore quando arriva una nuova prenotazione.
 */
export async function notifyGestoreNuovaPrenotazione(input: {
  gestoreId: string;
  modulo: string;
  riferimento: string;
  link: string;
}): Promise<void> {
  await createNotifica({
    userId: input.gestoreId,
    titolo: `Nuova prenotazione: ${input.modulo}`,
    messaggio: input.riferimento,
    tipo: "info",
    link: input.link,
  });
}

/**
 * Notifica + email di conferma all'utente quando crea una nuova prenotazione.
 * Best-effort: non solleva eccezioni se manca email o Resend non è configurato.
 */
export async function notifyUtenteNuovaPrenotazione(input: {
  userId: string;
  email?: string | null;
  modulo: string;
  riferimento: string;
  quando?: string;
  link: string;
}): Promise<void> {
  await createNotifica({
    userId: input.userId,
    titolo: `Prenotazione inviata: ${input.modulo}`,
    messaggio: input.riferimento,
    tipo: "successo",
    link: input.link,
  });

  if (input.email) {
    const dettagli: { label: string; value: string }[] = [
      { label: "Riferimento", value: input.riferimento },
    ];
    if (input.quando) dettagli.push({ label: "Quando", value: input.quando });

    await sendBookingStateEmail({
      to: input.email,
      subject: `Prenotazione ricevuta: ${input.riferimento}`,
      modulo: input.modulo,
      stato: "Ricevuta",
      variante: "info",
      intro:
        "Abbiamo ricevuto la tua richiesta. Riceverai un'altra email non appena il gestore confermerà la prenotazione.",
      dettagli,
      cta: { label: "Apri prenotazione", url: input.link },
    });
  }
}

/**
 * Lookup utility: dato un user_id ritorna l'email dalla tabella users.
 * Usata dagli helper booking per arricchire notifiche con email.
 */
export async function getUserEmail(userId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("email")
    .eq("id", userId)
    .single();
  return ((data as { email: string } | null) ?? null)?.email ?? null;
}
