"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  ristoranteSchema,
  tavoloSchema,
  prodottoSchema,
  type RistoranteInput,
  type TavoloInput,
  type ProdottoInput,
} from "./ristoranti-schemas";

type Result = { error: string } | { success: true; id: string };

function csvToArray(s: string | undefined) {
  return (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseOrari(text: string): Record<string, string> {
  // Free-form text: store as { "raw": text } so the schema column accepts it.
  if (!text.trim()) return {};
  return { raw: text.trim() };
}

export async function createRistorante(
  input: RistoranteInput,
): Promise<Result> {
  const parsed = ristoranteSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  const v = parsed.data;
  const { data, error } = await supabase
    .from("ristoranti")
    .insert({
      gestore_id: user.id,
      nome: v.nome,
      descrizione: v.descrizione || null,
      indirizzo: v.indirizzo,
      citta: v.citta,
      telefono: v.telefono || null,
      email: v.email || null,
      tipo_cucina: v.tipo_cucina || null,
      orari: parseOrari(v.orari ?? ""),
      immagini: csvToArray(v.immagini),
      stato: v.stato,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/ristoranti");
  return { success: true, id: (data as { id: string }).id };
}

export async function updateRistorante(
  id: string,
  input: RistoranteInput,
): Promise<Result> {
  const parsed = ristoranteSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("ristoranti")
    .update({
      nome: v.nome,
      descrizione: v.descrizione || null,
      indirizzo: v.indirizzo,
      citta: v.citta,
      telefono: v.telefono || null,
      email: v.email || null,
      tipo_cucina: v.tipo_cucina || null,
      orari: parseOrari(v.orari ?? ""),
      immagini: csvToArray(v.immagini),
      stato: v.stato,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/ristoranti");
  revalidatePath(`/dashboard/ristoranti/${id}`);
  return { success: true, id };
}

export async function deleteRistorante(
  id: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("ristoranti").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/ristoranti");
  return {};
}

export async function createTavolo(
  ristoranteId: string,
  input: TavoloInput,
): Promise<{ error?: string }> {
  const parsed = tavoloSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase.from("tavoli").insert({
    ristorante_id: ristoranteId,
    numero: v.numero,
    posti: v.posti,
    posizione: v.posizione || null,
    attivo: v.attivo,
  });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/ristoranti/${ristoranteId}`);
  return {};
}

export async function updateTavolo(
  tavoloId: string,
  ristoranteId: string,
  input: TavoloInput,
): Promise<{ error?: string }> {
  const parsed = tavoloSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("tavoli")
    .update({
      numero: v.numero,
      posti: v.posti,
      posizione: v.posizione || null,
      attivo: v.attivo,
    })
    .eq("id", tavoloId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/ristoranti/${ristoranteId}`);
  revalidatePath(`/dashboard/ristoranti/${ristoranteId}/tavoli`);
  return {};
}

export async function deleteTavolo(
  tavoloId: string,
  ristoranteId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("tavoli").delete().eq("id", tavoloId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/ristoranti/${ristoranteId}`);
  return {};
}

export async function updatePrenotazioneTavoloStato(
  prenotazioneId: string,
  ristoranteId: string,
  stato: "confermata" | "cancellata" | "completata" | "no_show",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prenotazioni_tavolo")
    .update({ stato })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { notifyBookingStateChange } = await import(
    "@/lib/notifications/booking-events"
  );
  const admin = createAdminClient();
  const { data } = await admin
    .from("prenotazioni_tavolo")
    .select(
      "utente_id, data_ora, num_ospiti, users:utente_id ( email ), tavoli:tavolo_id ( numero, ristoranti:ristorante_id ( nome ) )",
    )
    .eq("id", prenotazioneId)
    .single();
  type Row = {
    utente_id: string;
    data_ora: string;
    num_ospiti: number;
    users: { email: string } | null;
    tavoli: {
      numero: string;
      ristoranti: { nome: string } | null;
    } | null;
  };
  const r = data as unknown as Row | null;
  if (r) {
    const ristorante = r.tavoli?.ristoranti?.nome ?? "Ristorante";
    await notifyBookingStateChange({
      modulo: "Ristorante",
      stato,
      userId: r.utente_id,
      email: r.users?.email,
      riferimento: `${ristorante} — Tavolo ${r.tavoli?.numero ?? "?"} (${r.num_ospiti} ospiti)`,
      quando: new Date(r.data_ora).toLocaleString("it-IT"),
      link: "/dashboard/prenotazioni",
    });
  }

  revalidatePath(`/dashboard/ristoranti/${ristoranteId}/prenotazioni`);
  revalidatePath("/dashboard/prenotazioni");
  return {};
}

/**
 * Full update di una prenotazione tavolo: stato + dettagli (tavolo, data_ora,
 * num_ospiti, note). Nessun blocco di stato. (prenotazioni_tavolo non ha
 * stato_pagamento nel modello attuale, quindi quel campo non è gestito qui.)
 */
export async function updatePrenotazioneTavoloFull(
  prenotazioneId: string,
  ristoranteId: string,
  input: {
    stato: "in_attesa" | "confermata" | "cancellata" | "completata" | "no_show";
    tavoloId: string;
    dataOra: string;
    numOspiti: number;
    note?: string;
  },
): Promise<{ error?: string }> {
  if (!input.dataOra) return { error: "Data e ora obbligatorie" };
  if (!Number.isFinite(input.numOspiti) || input.numOspiti < 1)
    return { error: "Numero ospiti non valido" };

  const supabase = await createClient();

  // Verifica tavolo appartenga al ristorante
  const { data: tav } = await supabase
    .from("tavoli")
    .select("ristorante_id")
    .eq("id", input.tavoloId)
    .single();
  if (!tav) return { error: "Tavolo non trovato" };
  if ((tav as { ristorante_id: string }).ristorante_id !== ristoranteId)
    return { error: "Tavolo non appartiene al ristorante" };

  const { error } = await supabase
    .from("prenotazioni_tavolo")
    .update({
      stato: input.stato,
      tavolo_id: input.tavoloId,
      data_ora: input.dataOra,
      num_ospiti: input.numOspiti,
      note: input.note?.trim() || null,
    })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/ristoranti/${ristoranteId}/prenotazioni`);
  revalidatePath("/dashboard/prenotazioni");
  return {};
}

/**
 * Prenotazione "walk-in" / telefonica creata dal gestore.
 *
 * Lo schema attuale richiede `utente_id NOT NULL` con FK a `users`. Per
 * sbloccare il caso d'uso (cliente che chiama o si presenta) senza migrazione:
 * usiamo l'`id` del gestore come utente_id e impacchettiamo il riferimento
 * cliente nel campo `note` ("Walk-in: Mario Rossi · 333..."). La prenotazione
 * nasce già `confermata` (è il gestore stesso che la registra).
 */
export async function createManualPrenotazioneTavolo(
  ristoranteId: string,
  input: {
    tavoloId: string;
    dataOra: string;
    numOspiti: number;
    nomeCliente: string;
    telefonoCliente?: string;
    note?: string;
  },
): Promise<{ error?: string }> {
  const tavoloId = input.tavoloId;
  const dataOra = input.dataOra.trim();
  const num = Number(input.numOspiti);
  const nome = input.nomeCliente.trim();
  if (!tavoloId) return { error: "Seleziona un tavolo" };
  if (!dataOra) return { error: "Data e ora obbligatorie" };
  if (!Number.isFinite(num) || num < 1) return { error: "Numero ospiti non valido" };
  if (!nome || nome.length < 2) return { error: "Nome cliente troppo corto" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  // Verifica che il tavolo appartenga al ristorante (anti-tamper)
  const { data: tav } = await supabase
    .from("tavoli")
    .select("ristorante_id")
    .eq("id", tavoloId)
    .single();
  if (!tav) return { error: "Tavolo non trovato" };
  if ((tav as { ristorante_id: string }).ristorante_id !== ristoranteId)
    return { error: "Tavolo non appartiene al ristorante" };

  const noteParts = [
    `Walk-in: ${nome}`,
    input.telefonoCliente?.trim()
      ? `Tel: ${input.telefonoCliente.trim()}`
      : null,
    input.note?.trim() ? input.note.trim() : null,
  ].filter(Boolean);

  const { error } = await supabase.from("prenotazioni_tavolo").insert({
    tavolo_id: tavoloId,
    utente_id: user.id,
    data_ora: dataOra,
    num_ospiti: num,
    note: noteParts.join(" · "),
    stato: "confermata",
  });
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/ristoranti/${ristoranteId}/prenotazioni`);
  return {};
}

export async function createProdotto(
  ristoranteId: string,
  input: ProdottoInput,
): Promise<{ error?: string }> {
  const parsed = prodottoSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase.from("prodotti").insert({
    ristorante_id: ristoranteId,
    nome: v.nome,
    descrizione: v.descrizione || null,
    prezzo_cents: v.prezzo_cents,
    categoria: v.categoria || null,
    immagine_url: v.immagine_url || null,
  });
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/ristoranti/${ristoranteId}`);
  revalidatePath(`/ristoranti/${ristoranteId}`);
  return {};
}

export async function updateProdotto(
  prodottoId: string,
  ristoranteId: string,
  input: ProdottoInput,
): Promise<{ error?: string }> {
  const parsed = prodottoSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("prodotti")
    .update({
      nome: v.nome,
      descrizione: v.descrizione || null,
      prezzo_cents: v.prezzo_cents,
      categoria: v.categoria || null,
      immagine_url: v.immagine_url || null,
    })
    .eq("id", prodottoId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/ristoranti/${ristoranteId}`);
  revalidatePath(`/ristoranti/${ristoranteId}`);
  return {};
}

export async function deleteProdotto(
  prodottoId: string,
  ristoranteId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prodotti")
    .delete()
    .eq("id", prodottoId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/ristoranti/${ristoranteId}`);
  revalidatePath(`/ristoranti/${ristoranteId}`);
  return {};
}
