"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyGestoreNuovaPrenotazione } from "@/lib/notifications/booking-events";

type Result = { error?: string; success?: true; redirectTo?: string };

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ──────────────────────────────────────────────────────────────────────────
// Biglietti eventi
// ──────────────────────────────────────────────────────────────────────────
export async function acquistaBiglietto(eventoId: string): Promise<Result> {
  const userId = await currentUserId();
  if (!userId) return { redirectTo: `/login?next=/eventi/${eventoId}` };

  const admin = createAdminClient();

  const { data: evento, error: eErr } = await admin
    .from("eventi")
    .select("id, prezzo_cents, posti_disponibili, stato")
    .eq("id", eventoId)
    .single();
  if (eErr || !evento) return { error: "Evento non disponibile" };
  const ev = evento as { prezzo_cents: number; posti_disponibili: number; stato: string };
  if (ev.stato !== "pubblicato") return { error: "Evento non disponibile" };
  if (ev.posti_disponibili < 1) return { error: "Evento esaurito" };

  // Optimistic posti decrement guarded by current value to prevent oversell.
  const { error: updErr } = await admin
    .from("eventi")
    .update({ posti_disponibili: ev.posti_disponibili - 1 })
    .eq("id", eventoId)
    .eq("posti_disponibili", ev.posti_disponibili);
  if (updErr) return { error: "Posto non più disponibile, riprova." };

  const { error: insErr } = await admin.from("biglietti").insert({
    evento_id: eventoId,
    utente_id: userId,
    prezzo_pagato_cents: ev.prezzo_cents,
    stato: "valido",
  });
  if (insErr) {
    // Rollback the seat counter.
    await admin
      .from("eventi")
      .update({ posti_disponibili: ev.posti_disponibili })
      .eq("id", eventoId);
    return { error: insErr.message };
  }

  const { data: ev2 } = await admin
    .from("eventi")
    .select("titolo, gestore_id")
    .eq("id", eventoId)
    .single();
  if (ev2) {
    const e = ev2 as { titolo: string; gestore_id: string };
    await notifyGestoreNuovaPrenotazione({
      gestoreId: e.gestore_id,
      modulo: "Evento",
      riferimento: `${e.titolo} — biglietto venduto`,
      link: `/dashboard/eventi/${eventoId}/prenotazioni`,
    });
  }

  revalidatePath(`/eventi/${eventoId}`);
  revalidatePath("/dashboard/biglietti");
  return { success: true, redirectTo: "/dashboard/biglietti" };
}

// ──────────────────────────────────────────────────────────────────────────
// Prenotazione B&B
// ──────────────────────────────────────────────────────────────────────────
export async function prenotaCamera(input: {
  cameraId: string;
  strutturaId: string;
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
  ospiti: number;
}): Promise<Result> {
  const userId = await currentUserId();
  if (!userId)
    return { redirectTo: `/login?next=/bnb/${input.strutturaId}` };

  if (!input.checkIn || !input.checkOut) return { error: "Date richieste" };
  const ci = new Date(input.checkIn);
  const co = new Date(input.checkOut);
  if (!(co.getTime() > ci.getTime())) return { error: "Date non valide" };
  if (input.ospiti < 1) return { error: "Almeno 1 ospite" };

  const admin = createAdminClient();
  const { data: camera } = await admin
    .from("camere")
    .select("id, prezzo_notte_cents, capacita, disponibile, struttura_id")
    .eq("id", input.cameraId)
    .single();
  if (!camera) return { error: "Camera non trovata" };
  const c = camera as {
    prezzo_notte_cents: number;
    capacita: number;
    disponibile: boolean;
    struttura_id: string;
  };
  if (!c.disponibile) return { error: "Camera non disponibile" };
  if (input.ospiti > c.capacita)
    return { error: `Capacità massima ${c.capacita} ospiti` };

  const nights = Math.max(
    1,
    Math.round((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24)),
  );
  const total = nights * c.prezzo_notte_cents;

  const { error: insErr } = await admin.from("prenotazioni_bnb").insert({
    camera_id: input.cameraId,
    utente_id: userId,
    data_check_in: input.checkIn,
    data_check_out: input.checkOut,
    num_ospiti: input.ospiti,
    prezzo_totale_cents: total,
    stato: "in_attesa",
    stato_pagamento: "in_attesa",
  });
  if (insErr) return { error: insErr.message };

  // Notifica al gestore della struttura.
  const { data: struttura } = await admin
    .from("strutture")
    .select("nome, gestore_id")
    .eq("id", input.strutturaId)
    .single();
  if (struttura) {
    const s = struttura as { nome: string; gestore_id: string };
    await notifyGestoreNuovaPrenotazione({
      gestoreId: s.gestore_id,
      modulo: "B&B",
      riferimento: `${s.nome} (${input.checkIn} → ${input.checkOut}, ${input.ospiti} ospiti)`,
      link: `/dashboard/bnb/${input.strutturaId}/prenotazioni`,
    });
  }

  revalidatePath(`/bnb/${input.strutturaId}`);
  revalidatePath("/dashboard/prenotazioni");
  return { success: true, redirectTo: "/dashboard/prenotazioni" };
}

// ──────────────────────────────────────────────────────────────────────────
// Prenotazione tavolo
// ──────────────────────────────────────────────────────────────────────────
export async function prenotaTavolo(input: {
  ristoranteId: string;
  tavoloId: string;
  dataOra: string; // datetime-local string
  ospiti: number;
  note?: string;
}): Promise<Result> {
  const userId = await currentUserId();
  if (!userId)
    return { redirectTo: `/login?next=/ristoranti/${input.ristoranteId}` };

  if (!input.dataOra) return { error: "Data e ora richieste" };
  if (input.ospiti < 1) return { error: "Almeno 1 ospite" };

  const admin = createAdminClient();
  const { error: insErr } = await admin.from("prenotazioni_tavolo").insert({
    tavolo_id: input.tavoloId,
    utente_id: userId,
    data_ora: new Date(input.dataOra).toISOString(),
    num_ospiti: input.ospiti,
    stato: "in_attesa",
    note: input.note ?? null,
  });
  if (insErr) return { error: insErr.message };

  const { data: rist } = await admin
    .from("ristoranti")
    .select("nome, gestore_id")
    .eq("id", input.ristoranteId)
    .single();
  if (rist) {
    const r = rist as { nome: string; gestore_id: string };
    await notifyGestoreNuovaPrenotazione({
      gestoreId: r.gestore_id,
      modulo: "Ristorante",
      riferimento: `${r.nome} — ${new Date(input.dataOra).toLocaleString("it-IT")} (${input.ospiti} ospiti)`,
      link: `/dashboard/ristoranti/${input.ristoranteId}/prenotazioni`,
    });
  }

  revalidatePath(`/ristoranti/${input.ristoranteId}`);
  revalidatePath("/dashboard/prenotazioni");
  return { success: true, redirectTo: "/dashboard/prenotazioni" };
}

// ──────────────────────────────────────────────────────────────────────────
// Prenotazione visita guidata
// ──────────────────────────────────────────────────────────────────────────
export async function prenotaVisita(input: {
  attrazioneId: string;
  visitaId: string;
  partecipanti: number;
}): Promise<Result> {
  const userId = await currentUserId();
  if (!userId)
    return { redirectTo: `/login?next=/infopoint/${input.attrazioneId}` };
  if (input.partecipanti < 1) return { error: "Almeno 1 partecipante" };

  const admin = createAdminClient();
  const { data: visita } = await admin
    .from("visite_guidate")
    .select("id, prezzo_cents, posti_disponibili")
    .eq("id", input.visitaId)
    .single();
  if (!visita) return { error: "Visita non trovata" };
  const v = visita as { prezzo_cents: number; posti_disponibili: number };
  if (v.posti_disponibili < input.partecipanti)
    return { error: "Posti insufficienti" };

  const total = v.prezzo_cents * input.partecipanti;
  const { error: updErr } = await admin
    .from("visite_guidate")
    .update({ posti_disponibili: v.posti_disponibili - input.partecipanti })
    .eq("id", input.visitaId)
    .eq("posti_disponibili", v.posti_disponibili);
  if (updErr) return { error: "Posti non più disponibili" };

  const { error: insErr } = await admin.from("prenotazioni_visita").insert({
    visita_id: input.visitaId,
    utente_id: userId,
    num_partecipanti: input.partecipanti,
    prezzo_totale_cents: total,
    stato: "in_attesa",
    stato_pagamento: "in_attesa",
  });
  if (insErr) {
    await admin
      .from("visite_guidate")
      .update({ posti_disponibili: v.posti_disponibili })
      .eq("id", input.visitaId);
    return { error: insErr.message };
  }

  const { data: attr } = await admin
    .from("attrazioni")
    .select("nome, gestore_id")
    .eq("id", input.attrazioneId)
    .single();
  if (attr) {
    const a = attr as { nome: string; gestore_id: string };
    await notifyGestoreNuovaPrenotazione({
      gestoreId: a.gestore_id,
      modulo: "Visita guidata",
      riferimento: `${a.nome} — ${input.partecipanti} partecipant${input.partecipanti === 1 ? "e" : "i"}`,
      link: `/dashboard/infopoint/${input.attrazioneId}/prenotazioni`,
    });
  }

  revalidatePath(`/infopoint/${input.attrazioneId}`);
  revalidatePath("/dashboard/prenotazioni");
  return { success: true, redirectTo: "/dashboard/prenotazioni" };
}

// ──────────────────────────────────────────────────────────────────────────
// Acquisto corso
// ──────────────────────────────────────────────────────────────────────────
export async function acquistaCorso(corsoId: string): Promise<Result> {
  const userId = await currentUserId();
  if (!userId)
    return { redirectTo: `/login?next=/videolezioni/${corsoId}` };

  const admin = createAdminClient();
  const { data: corso } = await admin
    .from("corsi")
    .select("id, prezzo_cents, stato")
    .eq("id", corsoId)
    .single();
  if (!corso) return { error: "Corso non trovato" };
  const c = corso as { prezzo_cents: number; stato: string };
  if (c.stato !== "pubblicato") return { error: "Corso non disponibile" };

  const { error } = await admin.from("acquisti_video").insert({
    corso_id: corsoId,
    utente_id: userId,
    prezzo_pagato_cents: c.prezzo_cents,
  });
  if (error && !error.message.includes("duplicate"))
    return { error: error.message };

  if (!error) {
    const { data: c2 } = await admin
      .from("corsi")
      .select("titolo, gestore_id")
      .eq("id", corsoId)
      .single();
    if (c2) {
      const co = c2 as { titolo: string; gestore_id: string };
      await notifyGestoreNuovaPrenotazione({
        gestoreId: co.gestore_id,
        modulo: "Corso video",
        riferimento: `${co.titolo} — nuovo iscritto`,
        link: `/dashboard/video/${corsoId}/iscritti`,
      });
    }
  }

  revalidatePath(`/videolezioni/${corsoId}`);
  revalidatePath("/dashboard/miei-video");
  return { success: true, redirectTo: `/dashboard/miei-video/${corsoId}` };
}

// Checkout shop: gestito in src/lib/checkout/actions.ts (startCheckout) — il
// flusso pre-Stripe è stato rimosso a favore del checkout completo con
// PaymentIntent + webhook.
