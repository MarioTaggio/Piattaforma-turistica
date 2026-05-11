"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import {
  attrazioneSchema,
  visitaSchema,
  type AttrazioneInput,
  type VisitaInput,
} from "./infopoint-schemas";

async function tErrors() {
  return getTranslations("errors");
}
async function tValidation() {
  return getTranslations("validation");
}

type Result = { error: string } | { success: true; id: string };

function csvToArray(s: string | undefined) {
  return (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseOrari(text: string): Record<string, string> {
  if (!text.trim()) return {};
  return { raw: text.trim() };
}

export async function createAttrazione(
  input: AttrazioneInput,
): Promise<Result> {
  const parsed = attrazioneSchema.safeParse(input);
  if (!parsed.success) return { error: (await tValidation())("invalidData") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await tErrors())("sessionExpired") };

  const v = parsed.data;
  const { data, error } = await supabase
    .from("attrazioni")
    .insert({
      gestore_id: user.id,
      nome: v.nome,
      descrizione: v.descrizione || null,
      indirizzo: v.indirizzo,
      citta: v.citta,
      categoria: v.categoria || null,
      orari: parseOrari(v.orari ?? ""),
      immagini: csvToArray(v.immagini),
      stato: v.stato,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };

  const attrazioneId = (data as { id: string }).id;

  if (v.tour_url) {
    await supabase.from("tour_virtuali").insert({
      attrazione_id: attrazioneId,
      titolo: `Tour virtuale ${v.nome}`,
      url_tour: v.tour_url,
      gratuito: v.tour_gratuito,
      prezzo_cents: 0,
      stato: v.stato,
    });
  }

  revalidatePath("/dashboard/infopoint");
  return { success: true, id: attrazioneId };
}

export async function updateAttrazione(
  id: string,
  input: AttrazioneInput,
): Promise<Result> {
  const parsed = attrazioneSchema.safeParse(input);
  if (!parsed.success) return { error: (await tValidation())("invalidData") };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("attrazioni")
    .update({
      nome: v.nome,
      descrizione: v.descrizione || null,
      indirizzo: v.indirizzo,
      citta: v.citta,
      categoria: v.categoria || null,
      orari: parseOrari(v.orari ?? ""),
      immagini: csvToArray(v.immagini),
      stato: v.stato,
    })
    .eq("id", id);
  if (error) return { error: error.message };

  // Upsert primary tour_virtuale (one per attrazione for now).
  if (v.tour_url) {
    const { data: existing } = await supabase
      .from("tour_virtuali")
      .select("id")
      .eq("attrazione_id", id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("tour_virtuali")
        .update({
          url_tour: v.tour_url,
          gratuito: v.tour_gratuito,
          stato: v.stato,
        })
        .eq("id", (existing as { id: string }).id);
    } else {
      await supabase.from("tour_virtuali").insert({
        attrazione_id: id,
        titolo: `Tour virtuale ${v.nome}`,
        url_tour: v.tour_url,
        gratuito: v.tour_gratuito,
        prezzo_cents: 0,
        stato: v.stato,
      });
    }
  }

  revalidatePath("/dashboard/infopoint");
  revalidatePath(`/dashboard/infopoint/${id}`);
  return { success: true, id };
}

export async function deleteAttrazione(
  id: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("attrazioni").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/infopoint");
  return {};
}

export async function createVisita(
  attrazioneId: string,
  input: VisitaInput,
): Promise<{ error?: string }> {
  const parsed = visitaSchema.safeParse(input);
  if (!parsed.success) return { error: (await tValidation())("invalidData") };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: (await tErrors())("sessionExpired") };

  const v = parsed.data;
  const { error } = await supabase.from("visite_guidate").insert({
    attrazione_id: attrazioneId,
    gestore_id: user.id,
    titolo: v.titolo,
    descrizione: v.descrizione || null,
    data_ora: v.data_ora,
    durata_minuti: v.durata_minuti,
    posti_totali: v.posti_totali,
    posti_disponibili: v.posti_totali,
    prezzo_cents: v.prezzo_cents,
    lingua: v.lingua,
    stato: v.stato,
  });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/infopoint/${attrazioneId}`);
  return {};
}

export async function updateVisita(
  visitaId: string,
  attrazioneId: string,
  input: VisitaInput,
): Promise<{ error?: string }> {
  const parsed = visitaSchema.safeParse(input);
  if (!parsed.success) return { error: (await tValidation())("invalidData") };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("visite_guidate")
    .update({
      titolo: v.titolo,
      descrizione: v.descrizione || null,
      data_ora: v.data_ora,
      durata_minuti: v.durata_minuti,
      posti_totali: v.posti_totali,
      prezzo_cents: v.prezzo_cents,
      lingua: v.lingua,
      stato: v.stato,
    })
    .eq("id", visitaId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/infopoint/${attrazioneId}`);
  revalidatePath(`/dashboard/infopoint/${attrazioneId}/visite`);
  return {};
}

export async function deleteVisita(
  visitaId: string,
  attrazioneId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("visite_guidate")
    .delete()
    .eq("id", visitaId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/infopoint/${attrazioneId}`);
  return {};
}

export async function updatePrenotazioneVisitaStato(
  prenotazioneId: string,
  attrazioneId: string,
  stato: "confermata" | "cancellata" | "completata",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prenotazioni_visita")
    .update({ stato })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { notifyBookingStateChange } = await import(
    "@/lib/notifications/booking-events"
  );
  const admin = createAdminClient();
  const { data } = await admin
    .from("prenotazioni_visita")
    .select(
      "utente_id, num_partecipanti, users:utente_id ( email ), visite_guidate:visita_id ( titolo, data_ora, attrazioni:attrazione_id ( nome ) )",
    )
    .eq("id", prenotazioneId)
    .single();
  type Row = {
    utente_id: string;
    num_partecipanti: number;
    users: { email: string } | null;
    visite_guidate: {
      titolo: string;
      data_ora: string;
      attrazioni: { nome: string } | null;
    } | null;
  };
  const r = data as unknown as Row | null;
  if (r) {
    const visita = r.visite_guidate?.titolo ?? "Visita guidata";
    const luogo = r.visite_guidate?.attrazioni?.nome ?? "";
    await notifyBookingStateChange({
      modulo: "Visita guidata",
      stato,
      userId: r.utente_id,
      email: r.users?.email,
      riferimento: luogo ? `${visita} — ${luogo}` : visita,
      quando: r.visite_guidate?.data_ora
        ? new Date(r.visite_guidate.data_ora).toLocaleString("it-IT")
        : undefined,
      link: "/dashboard/prenotazioni",
    });
  }

  revalidatePath(`/dashboard/infopoint/${attrazioneId}/prenotazioni`);
  revalidatePath("/dashboard/prenotazioni");
  return {};
}

export async function updatePrenotazioneVisitaPagamento(
  prenotazioneId: string,
  attrazioneId: string,
  stato_pagamento: "in_attesa" | "pagato" | "fallito" | "rimborsato",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prenotazioni_visita")
    .update({ stato_pagamento })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/infopoint/${attrazioneId}/prenotazioni`);
  revalidatePath("/dashboard/prenotazioni");
  return {};
}

/**
 * Full update di una prenotazione visita guidata: stato + pagamento +
 * num_partecipanti. Nessun blocco di stato.
 */
export async function updatePrenotazioneVisitaFull(
  prenotazioneId: string,
  attrazioneId: string,
  input: {
    stato: "in_attesa" | "confermata" | "cancellata" | "completata" | "no_show";
    statoPagamento: "in_attesa" | "pagato" | "fallito" | "rimborsato";
    numPartecipanti: number;
  },
): Promise<{ error?: string }> {
  if (!Number.isFinite(input.numPartecipanti) || input.numPartecipanti < 1)
    return { error: (await tErrors())("invalidParticipants") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("prenotazioni_visita")
    .update({
      stato: input.stato,
      stato_pagamento: input.statoPagamento,
      num_partecipanti: input.numPartecipanti,
    })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/infopoint/${attrazioneId}/prenotazioni`);
  revalidatePath("/dashboard/prenotazioni");
  return {};
}

export async function updatePrenotazioneVisitaPartecipanti(
  prenotazioneId: string,
  attrazioneId: string,
  num_partecipanti: number,
): Promise<{ error?: string }> {
  const n = Number(num_partecipanti);
  if (!Number.isFinite(n) || n < 1)
    return { error: (await tErrors())("invalidParticipants") };
  const supabase = await createClient();
  const { error } = await supabase
    .from("prenotazioni_visita")
    .update({ num_partecipanti: n })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/infopoint/${attrazioneId}/prenotazioni`);
  return {};
}

// ──────────────────────────────────────────────────────────────────────────
// Comunicazioni — invia email a tutti i prenotati delle visite di un'attrazione
// ──────────────────────────────────────────────────────────────────────────
export async function sendEmailToAttrazioneVisitatori(
  attrazioneId: string,
  input: { subject: string; messaggio: string },
): Promise<{ error?: string; sent?: number }> {
  const subject = input.subject.trim();
  const messaggio = input.messaggio.trim();
  if (!subject || subject.length < 3)
    return { error: (await tErrors())("subjectTooShort") };
  if (!messaggio || messaggio.length < 10)
    return { error: (await tErrors())("messageTooShort") };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { createNotifica } = await import("@/lib/notifications/create");
  const { sendBookingStateEmail } = await import("@/lib/resend/booking-state");

  const admin = createAdminClient();
  const { data: attr } = await admin
    .from("attrazioni")
    .select("nome, gestore_id")
    .eq("id", attrazioneId)
    .single();
  if (!attr) return { error: (await tErrors())("attractionNotFound") };
  const a = attr as { nome: string; gestore_id: string };

  const { data: rows } = await admin
    .from("prenotazioni_visita")
    .select(
      "utente_id, users:utente_id ( email ), visite_guidate:visita_id!inner ( attrazione_id )",
    )
    .eq("visite_guidate.attrazione_id", attrazioneId)
    .neq("stato", "cancellata");

  type Row = {
    utente_id: string;
    users: { email: string } | null;
  };
  // Dedupe per utente_id
  const map = new Map<string, string>();
  for (const r of (rows ?? []) as unknown as Row[]) {
    if (r.users?.email) map.set(r.utente_id, r.users.email);
  }
  if (map.size === 0) return { error: (await tErrors())("noRecipients") };

  let sent = 0;
  for (const [userId, email] of map.entries()) {
    await createNotifica({
      userId,
      titolo: subject,
      messaggio: `Comunicazione da ${a.nome}`,
      tipo: "info",
      link: "/dashboard/prenotazioni",
    });
    const result = await sendBookingStateEmail({
      to: email,
      subject,
      modulo: "Visita guidata",
      stato: "Comunicazione",
      variante: "info",
      intro: messaggio,
      dettagli: [{ label: "Attrazione", value: a.nome }],
      cta: { label: "Apri prenotazioni", url: "/dashboard/prenotazioni" },
    });
    if (result.ok) sent += 1;
  }

  const { revalidatePath } = await import("next/cache");
  revalidatePath(`/dashboard/infopoint/${attrazioneId}/comunicazioni`);
  return { sent };
}
