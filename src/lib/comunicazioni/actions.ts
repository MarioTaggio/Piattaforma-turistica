"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createNotifica } from "@/lib/notifications/create";
import { sendBookingStateEmail } from "@/lib/resend/booking-state";

type SendInput = {
  // Destinatario: l'utente a cui inviare
  userId: string;
  // Oggetto email
  subject: string;
  // Testo libero (visualizzato sia nell'email che come notifica)
  testo: string;
  // Se true, INSERT anche in `notifiche` (campanella in-app)
  sendNotifica: boolean;
  // Modulo per il template email (es. "Evento", "B&B", "Ristorante")
  modulo: string;
  // Riferimento per contesto utente (es. "Cena Romana 5 luglio", "Camera 2")
  riferimento?: string;
  // Link in-app per la CTA email (la notifica usa /dashboard/comunicazioni/[id]).
  // Se assente, fallback a /dashboard/comunicazioni.
  link?: string;
  // Tipo gestore mittente (es. "gestore_bnb"). Salvato in `comunicazioni.tipo_mittente`.
  tipoMittente?: string;
  // Nome leggibile del business (es. "Hotel Bella Vista"). Salvato in `comunicazioni.entita_nome`.
  entitaNome?: string;
};

/**
 * Invia una comunicazione free-form da un gestore a un utente.
 * - INSERT nella tabella `comunicazioni` (archivio + pagina utente)
 * - Email via Resend (template verde brand)
 * - Opzionalmente, notifica in-app (campanella) col link al dettaglio
 *
 * Best-effort: non solleva eccezioni, ritorna { error } su fallimento.
 */
export async function sendComunicazione(
  input: SendInput,
): Promise<{ error?: string; ok?: true; comunicazioneId?: string }> {
  const subject = input.subject.trim();
  const testo = input.testo.trim();
  if (!subject || subject.length < 3)
    return { error: "Oggetto troppo corto (min 3 caratteri)" };
  if (!testo || testo.length < 10)
    return { error: "Messaggio troppo corto (min 10 caratteri)" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  const admin = createAdminClient();

  // Recupera email del destinatario
  const { data: dest } = await admin
    .from("users")
    .select("email")
    .eq("id", input.userId)
    .single();
  const destEmail = (dest as { email: string } | null)?.email;
  if (!destEmail) return { error: "Email destinatario non trovata" };

  // INSERT nella tabella comunicazioni — è la fonte di verità per la pagina
  // utente /dashboard/comunicazioni.
  const { data: comRow, error: comErr } = await admin
    .from("comunicazioni")
    .insert({
      mittente_id: user.id,
      destinatario_id: input.userId,
      oggetto: subject,
      testo,
      tipo_mittente: input.tipoMittente ?? null,
      entita_nome: input.entitaNome ?? input.riferimento ?? null,
      link: input.link ?? null,
    })
    .select("id")
    .single();
  if (comErr || !comRow) {
    return { error: comErr?.message ?? "Errore archivio comunicazione" };
  }
  const comunicazioneId = (comRow as { id: string }).id;

  // Notifica in-app (opzionale) — link al dettaglio della comunicazione.
  if (input.sendNotifica) {
    await createNotifica({
      userId: input.userId,
      titolo: subject,
      messaggio: input.riferimento
        ? `${input.modulo} — ${input.riferimento}`
        : input.modulo,
      tipo: "info",
      link: `/dashboard/comunicazioni/${comunicazioneId}`,
    });
  }

  // Email — la CTA porta alla dashboard (link contesto se fornito,
  // altrimenti la pagina comunicazioni).
  const r = await sendBookingStateEmail({
    to: destEmail,
    subject,
    modulo: input.modulo,
    stato: "Comunicazione",
    variante: "info",
    intro: testo,
    dettagli: input.riferimento
      ? [{ label: "Riferimento", value: input.riferimento }]
      : undefined,
    cta: {
      label: "Apri comunicazione",
      url: `/dashboard/comunicazioni/${comunicazioneId}`,
    },
  });

  if (!r.ok) return { error: r.error ?? "Invio email fallito" };
  return { ok: true, comunicazioneId };
}

type MassInput = {
  userIds: string[];
  subject: string;
  testo: string;
  sendNotifica: boolean;
  modulo: string;
  riferimento?: string;
  link?: string;
  tipoMittente?: string;
  entitaNome?: string;
};

/**
 * Invio massivo della stessa comunicazione a più utenti (es. tutti gli iscritti
 * a un corso). Dedupe per userId. Ritorna `sent` = quanti email sono andate a
 * buon fine; non blocca al primo fallimento.
 *
 * Crea un record `comunicazioni` per ogni destinatario e una notifica
 * (opzionale) col link al rispettivo dettaglio.
 */
export async function sendComunicazioneMass(
  input: MassInput,
): Promise<{ error?: string; sent?: number }> {
  const subject = input.subject.trim();
  const testo = input.testo.trim();
  if (!subject || subject.length < 3)
    return { error: "Oggetto troppo corto (min 3 caratteri)" };
  if (!testo || testo.length < 10)
    return { error: "Messaggio troppo corto (min 10 caratteri)" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  const ids = Array.from(new Set(input.userIds));
  if (ids.length === 0) return { error: "Nessun destinatario" };

  const admin = createAdminClient();
  const { data: dest } = await admin
    .from("users")
    .select("id, email")
    .in("id", ids);
  const rows = (dest ?? []) as { id: string; email: string }[];
  if (rows.length === 0) return { error: "Nessun destinatario valido" };

  let sent = 0;
  for (const r of rows) {
    // Archivio comunicazioni — uno per destinatario.
    const { data: comRow } = await admin
      .from("comunicazioni")
      .insert({
        mittente_id: user.id,
        destinatario_id: r.id,
        oggetto: subject,
        testo,
        tipo_mittente: input.tipoMittente ?? null,
        entita_nome: input.entitaNome ?? input.riferimento ?? null,
        link: input.link ?? null,
      })
      .select("id")
      .single();
    const comId = (comRow as { id: string } | null)?.id;

    if (input.sendNotifica && comId) {
      await createNotifica({
        userId: r.id,
        titolo: subject,
        messaggio: input.riferimento
          ? `${input.modulo} — ${input.riferimento}`
          : input.modulo,
        tipo: "info",
        link: `/dashboard/comunicazioni/${comId}`,
      });
    }
    const result = await sendBookingStateEmail({
      to: r.email,
      subject,
      modulo: input.modulo,
      stato: "Comunicazione",
      variante: "info",
      intro: testo,
      dettagli: input.riferimento
        ? [{ label: "Riferimento", value: input.riferimento }]
        : undefined,
      cta: comId
        ? {
            label: "Apri comunicazione",
            url: `/dashboard/comunicazioni/${comId}`,
          }
        : input.link
          ? { label: "Apri dashboard", url: input.link }
          : undefined,
    });
    if (result.ok) sent += 1;
  }

  return { sent };
}

/**
 * Segna una comunicazione come letta. Chiamata dalla pagina di dettaglio
 * `/dashboard/comunicazioni/[id]` al primo accesso.
 */
export async function markComunicazioneLetta(
  id: string,
): Promise<{ error?: string; ok?: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  const { error } = await supabase
    .from("comunicazioni")
    .update({ letta: true })
    .eq("id", id)
    .eq("destinatario_id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}
