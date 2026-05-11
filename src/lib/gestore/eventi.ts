"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createNotifica } from "@/lib/notifications/create";
import { sendBookingStateEmail } from "@/lib/resend/booking-state";
import { eventoSchema, type EventoInput } from "./eventi-schemas";

// Helper: carica le traduzioni "errors" usando il cookie locale corrente
// gestito da i18n/request.ts. Una sola istanza per chiamata di action.
async function tErrors() {
  return getTranslations("errors");
}

type Result =
  | { error: string }
  | { success: true; id: string };

export async function createEvento(input: EventoInput): Promise<Result> {
  const parsed = eventoSchema.safeParse(input);
  if (!parsed.success) return { error: (await getTranslations("validation"))("invalidData") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await tErrors())("sessionExpired") };

  const v = parsed.data;
  const { data, error } = await supabase
    .from("eventi")
    .insert({
      gestore_id: user.id,
      titolo: v.titolo,
      descrizione: v.descrizione || null,
      luogo: v.luogo,
      citta: v.citta || null,
      data_inizio: v.data_inizio,
      data_fine: v.data_fine,
      prezzo_cents: v.prezzo_cents,
      posti_totali: v.posti_totali,
      posti_disponibili: v.posti_totali,
      immagine_url: v.immagine_url || null,
      stato: v.stato,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/eventi");
  return { success: true, id: (data as { id: string }).id };
}

export async function updateEvento(
  id: string,
  input: EventoInput,
): Promise<Result> {
  const parsed = eventoSchema.safeParse(input);
  if (!parsed.success) return { error: (await getTranslations("validation"))("invalidData") };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("eventi")
    .update({
      titolo: v.titolo,
      descrizione: v.descrizione || null,
      luogo: v.luogo,
      citta: v.citta || null,
      data_inizio: v.data_inizio,
      data_fine: v.data_fine,
      prezzo_cents: v.prezzo_cents,
      posti_totali: v.posti_totali,
      immagine_url: v.immagine_url || null,
      stato: v.stato,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/eventi");
  revalidatePath(`/dashboard/eventi/${id}`);
  return { success: true, id };
}

export async function deleteEvento(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("eventi").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/eventi");
  return {};
}

// ──────────────────────────────────────────────────────────────────────────
// Biglietti — gestione lato gestore (valida, annulla, rimborsa, reminder)
// ──────────────────────────────────────────────────────────────────────────
type BigliettoStato =
  | "valido"
  | "utilizzato"
  | "rimborsato"
  | "annullato";

const BIGLIETTO_LABEL: Record<BigliettoStato, string> = {
  valido: "Valido",
  utilizzato: "Utilizzato",
  rimborsato: "Rimborsato",
  annullato: "Annullato",
};

export async function updateBigliettoStato(
  bigliettoId: string,
  eventoId: string,
  stato: BigliettoStato,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const update: Record<string, unknown> = { stato };
  if (stato === "utilizzato") update.utilizzato_at = new Date().toISOString();

  const { error } = await supabase
    .from("biglietti")
    .update(update)
    .eq("id", bigliettoId);
  if (error) return { error: error.message };

  // Se rimborso o annullamento → restituisci il posto.
  if (stato === "rimborsato" || stato === "annullato") {
    const admin = createAdminClient();
    const { data: ev } = await admin
      .from("eventi")
      .select("posti_disponibili, titolo")
      .eq("id", eventoId)
      .single();
    if (ev) {
      const posti = (ev as { posti_disponibili: number }).posti_disponibili;
      await admin
        .from("eventi")
        .update({ posti_disponibili: posti + 1 })
        .eq("id", eventoId);
    }
  }

  await notifyBigliettoUpdate(bigliettoId, eventoId, stato);

  revalidatePath(`/dashboard/eventi/${eventoId}/prenotazioni`);
  revalidatePath("/dashboard/biglietti");
  return {};
}

export async function sendBigliettoReminder(
  bigliettoId: string,
  eventoId: string,
): Promise<{ error?: string }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("biglietti")
    .select(
      "id, codice, utente_id, users:utente_id ( email, nome, cognome ), eventi:evento_id ( titolo, data_inizio, luogo )",
    )
    .eq("id", bigliettoId)
    .single();
  type Row = {
    id: string;
    codice: string;
    utente_id: string;
    users: { email: string; nome: string | null; cognome: string | null } | null;
    eventi: { titolo: string; data_inizio: string; luogo: string } | null;
  };
  const row = data as unknown as Row | null;
  if (!row?.users?.email || !row.eventi)
    return { error: (await tErrors())("incompleteTicketData") };

  await createNotifica({
    userId: row.utente_id,
    titolo: `Reminder: ${row.eventi.titolo}`,
    messaggio: "L'evento si avvicina, controlla i dettagli del biglietto.",
    tipo: "info",
    link: "/dashboard/biglietti",
  });

  const r = await sendBookingStateEmail({
    to: row.users.email,
    subject: `Reminder: ${row.eventi.titolo}`,
    modulo: "Evento",
    stato: "Reminder",
    variante: "info",
    intro:
      "Ti ricordiamo che hai un biglietto valido per il prossimo evento. Presenta il QR code all'ingresso.",
    dettagli: [
      { label: "Evento", value: row.eventi.titolo },
      { label: "Luogo", value: row.eventi.luogo },
      { label: "Quando", value: new Date(row.eventi.data_inizio).toLocaleString("it-IT") },
      { label: "Codice biglietto", value: row.codice.slice(0, 8) + "…" },
    ],
    cta: { label: "Apri biglietto", url: "/dashboard/biglietti" },
  });

  if (!r.ok) return { error: r.error ?? "Invio email fallito" };
  revalidatePath(`/dashboard/eventi/${eventoId}/prenotazioni`);
  return {};
}

async function notifyBigliettoUpdate(
  bigliettoId: string,
  eventoId: string,
  stato: BigliettoStato,
): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("biglietti")
    .select(
      "id, codice, utente_id, users:utente_id ( email ), eventi:evento_id ( titolo )",
    )
    .eq("id", bigliettoId)
    .single();
  type Row = {
    id: string;
    codice: string;
    utente_id: string;
    users: { email: string } | null;
    eventi: { titolo: string } | null;
  };
  const row = data as unknown as Row | null;
  if (!row) return;

  const eventoTitle = row.eventi?.titolo ?? "Evento";
  const stateLabel = BIGLIETTO_LABEL[stato];
  const codeShort = row.codice.slice(0, 8).toUpperCase();

  await createNotifica({
    userId: row.utente_id,
    titolo: `Biglietto ${codeShort}: ${stateLabel.toLowerCase()}`,
    messaggio: eventoTitle,
    tipo:
      stato === "utilizzato"
        ? "successo"
        : stato === "rimborsato" || stato === "annullato"
          ? "errore"
          : "info",
    link: "/dashboard/biglietti",
  });

  if (
    row.users?.email &&
    (stato === "rimborsato" || stato === "annullato" || stato === "utilizzato")
  ) {
    await sendBookingStateEmail({
      to: row.users.email,
      subject: `Biglietto ${stateLabel.toLowerCase()}: ${eventoTitle}`,
      modulo: "Evento",
      stato: stateLabel,
      variante:
        stato === "utilizzato"
          ? "successo"
          : stato === "rimborsato"
            ? "info"
            : "errore",
      intro:
        stato === "utilizzato"
          ? "Il tuo biglietto è stato validato all'ingresso. Buon evento!"
          : stato === "rimborsato"
            ? "Abbiamo emesso il rimborso del tuo biglietto. Riceverai l'accredito secondo i tempi del tuo metodo di pagamento."
            : "Il tuo biglietto è stato annullato dall'organizzatore.",
      dettagli: [
        { label: "Evento", value: eventoTitle },
        { label: "Codice biglietto", value: codeShort },
      ],
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Scanner ingresso — lookup biglietto da codice + marca utilizzato
// ──────────────────────────────────────────────────────────────────────────
type LookupOk = {
  ok: true;
  biglietto: {
    id: string;
    codice: string;
    stato: BigliettoStato;
    utilizzato_at: string | null;
    eventoId: string;
    eventoTitolo: string;
    acquirenteNome: string;
    acquirenteEmail: string;
  };
};
type LookupErr = { ok: false; reason: "not_found" | "wrong_event"; message: string };

/**
 * Cerca un biglietto a partire dal codice scansionato (UUID). Se l'evento
 * `eventoId` non corrisponde a quello del biglietto, restituisce `wrong_event`
 * — utile quando il gestore scansiona un biglietto di un altro evento per
 * sbaglio. Non cambia stato: è una sola lookup.
 *
 * Verifica ownership lato chiamante (la pagina scanner protegge l'accesso).
 * Usa admin client per evitare RLS noise (le RLS sui biglietti sono
 * already restrittive).
 */
export async function lookupBigliettoByCodice(
  codice: string,
  eventoId: string,
): Promise<LookupOk | LookupErr> {
  const code = codice.trim();
  if (!code)
    return { ok: false, reason: "not_found", message: "Codice vuoto" };

  const admin = createAdminClient();
  const { data } = await admin
    .from("biglietti")
    .select(
      `id, codice, stato, utilizzato_at, evento_id,
       eventi:evento_id ( titolo ),
       users:utente_id ( nome, cognome, email )`,
    )
    .eq("codice", code)
    .maybeSingle();

  type Row = {
    id: string;
    codice: string;
    stato: BigliettoStato;
    utilizzato_at: string | null;
    evento_id: string;
    eventi: { titolo: string } | null;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  };
  const r = data as unknown as Row | null;
  if (!r)
    return { ok: false, reason: "not_found", message: "Biglietto non trovato" };

  if (r.evento_id !== eventoId)
    return {
      ok: false,
      reason: "wrong_event",
      message: "Questo biglietto è di un altro evento",
    };

  const fullName =
    [r.users?.nome, r.users?.cognome].filter(Boolean).join(" ").trim() || "—";

  return {
    ok: true,
    biglietto: {
      id: r.id,
      codice: r.codice,
      stato: r.stato,
      utilizzato_at: r.utilizzato_at,
      eventoId: r.evento_id,
      eventoTitolo: r.eventi?.titolo ?? "",
      acquirenteNome: fullName,
      acquirenteEmail: r.users?.email ?? "",
    },
  };
}

/**
 * Marca un biglietto come utilizzato (timbra l'ingresso). Verifica che lo
 * stato attuale sia `valido` prima di applicare il cambio — restituisce un
 * messaggio d'errore esplicito se è già utilizzato/rimborsato/annullato.
 */
export async function markBigliettoUtilizzato(
  bigliettoId: string,
  eventoId: string,
): Promise<{ error?: string; ok?: true }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("biglietti")
    .select("stato, evento_id")
    .eq("id", bigliettoId)
    .single();
  const row = data as { stato: BigliettoStato; evento_id: string } | null;
  if (!row) return { error: (await tErrors())("ticketNotFound") };
  if (row.evento_id !== eventoId)
    return { error: (await tErrors())("ticketNotInEvent") };
  if (row.stato === "utilizzato")
    return { error: (await tErrors())("ticketAlreadyUsed") };
  if (row.stato !== "valido")
    return { error: `Biglietto ${row.stato}, non può essere validato` };

  const { error } = await admin
    .from("biglietti")
    .update({ stato: "utilizzato", utilizzato_at: new Date().toISOString() })
    .eq("id", bigliettoId);
  if (error) return { error: error.message };

  // Notifica + email: riusa il path già pronto.
  await notifyBigliettoUpdate(bigliettoId, eventoId, "utilizzato");

  revalidatePath(`/dashboard/eventi/${eventoId}/scanner`);
  revalidatePath(`/dashboard/eventi/${eventoId}/prenotazioni`);
  return { ok: true };
}

// ──────────────────────────────────────────────────────────────────────────
// Comunicazioni — invia email a tutti i partecipanti dell'evento
// ──────────────────────────────────────────────────────────────────────────
export async function sendEmailToEventoPartecipanti(
  eventoId: string,
  input: { subject: string; messaggio: string },
): Promise<{ error?: string; sent?: number }> {
  const subject = input.subject.trim();
  const messaggio = input.messaggio.trim();
  if (!subject || subject.length < 3)
    return { error: (await tErrors())("subjectTooShort") };
  if (!messaggio || messaggio.length < 10)
    return { error: (await tErrors())("messageTooShort") };

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("eventi")
    .select("titolo, gestore_id")
    .eq("id", eventoId)
    .single();
  if (!ev) return { error: (await tErrors())("eventNotFound") };
  const e = ev as { titolo: string; gestore_id: string };

  const { data: rows } = await admin
    .from("biglietti")
    .select("utente_id, users:utente_id ( email )")
    .eq("evento_id", eventoId)
    .eq("stato", "valido");

  type Row = {
    utente_id: string;
    users: { email: string } | null;
  };
  const list = ((rows ?? []) as unknown as Row[]).filter(
    (r) => r.users?.email,
  );

  if (list.length === 0) return { error: (await tErrors())("noRecipients") };

  let sent = 0;
  for (const r of list) {
    if (!r.users) continue;
    // Notifica in-app
    await createNotifica({
      userId: r.utente_id,
      titolo: subject,
      messaggio: `Comunicazione da ${e.titolo}`,
      tipo: "info",
      link: "/dashboard/biglietti",
    });
    // Email
    const result = await sendBookingStateEmail({
      to: r.users.email,
      subject,
      modulo: "Evento",
      stato: "Comunicazione",
      variante: "info",
      intro: messaggio,
      dettagli: [{ label: "Evento", value: e.titolo }],
      cta: { label: "Apri biglietto", url: "/dashboard/biglietti" },
    });
    if (result.ok) sent += 1;
  }

  revalidatePath(`/dashboard/eventi/${eventoId}/comunicazioni`);
  return { sent };
}
