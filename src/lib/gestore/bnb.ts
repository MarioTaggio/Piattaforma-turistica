"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  strutturaSchema,
  cameraSchema,
  type StrutturaInput,
  type CameraInput,
} from "./bnb-schemas";

type Result = { error: string } | { success: true; id: string };

function csvToArray(s: string | undefined): string[] {
  return (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function createStruttura(input: StrutturaInput): Promise<Result> {
  const parsed = strutturaSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  const v = parsed.data;
  const { data, error } = await supabase
    .from("strutture")
    .insert({
      gestore_id: user.id,
      nome: v.nome,
      descrizione: v.descrizione || null,
      indirizzo: v.indirizzo,
      citta: v.citta,
      cap: v.cap || null,
      stelle: v.stelle ?? null,
      servizi: csvToArray(v.servizi),
      immagini: csvToArray(v.immagini),
      stato: v.stato,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bnb");
  return { success: true, id: (data as { id: string }).id };
}

export async function updateStruttura(
  id: string,
  input: StrutturaInput,
): Promise<Result> {
  const parsed = strutturaSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("strutture")
    .update({
      nome: v.nome,
      descrizione: v.descrizione || null,
      indirizzo: v.indirizzo,
      citta: v.citta,
      cap: v.cap || null,
      stelle: v.stelle ?? null,
      servizi: csvToArray(v.servizi),
      immagini: csvToArray(v.immagini),
      stato: v.stato,
    })
    .eq("id", id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/bnb");
  revalidatePath(`/dashboard/bnb/${id}`);
  return { success: true, id };
}

export async function deleteStruttura(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("strutture").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/bnb");
  return {};
}

export async function createCamera(
  strutturaId: string,
  input: CameraInput,
): Promise<{ error?: string }> {
  const parsed = cameraSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase.from("camere").insert({
    struttura_id: strutturaId,
    nome: v.nome,
    descrizione: v.descrizione || null,
    capacita: v.capacita,
    prezzo_notte_cents: v.prezzo_notte_cents,
    disponibile: v.disponibile,
  });

  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bnb/${strutturaId}`);
  return {};
}

export async function updateCamera(
  cameraId: string,
  strutturaId: string,
  input: CameraInput,
): Promise<{ error?: string }> {
  const parsed = cameraSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("camere")
    .update({
      nome: v.nome,
      descrizione: v.descrizione || null,
      capacita: v.capacita,
      prezzo_notte_cents: v.prezzo_notte_cents,
      disponibile: v.disponibile,
    })
    .eq("id", cameraId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bnb/${strutturaId}`);
  revalidatePath(`/dashboard/bnb/${strutturaId}/camere`);
  return {};
}

export async function deleteCamera(
  cameraId: string,
  strutturaId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("camere").delete().eq("id", cameraId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bnb/${strutturaId}`);
  return {};
}

export async function updatePrenotazioneBnbStato(
  prenotazioneId: string,
  strutturaId: string,
  stato: "confermata" | "cancellata" | "completata",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prenotazioni_bnb")
    .update({ stato })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const { notifyBookingStateChange } = await import(
    "@/lib/notifications/booking-events"
  );
  const admin = createAdminClient();
  const { data } = await admin
    .from("prenotazioni_bnb")
    .select(
      "utente_id, data_check_in, data_check_out, users:utente_id ( email ), camere:camera_id ( nome, strutture:struttura_id ( nome ) )",
    )
    .eq("id", prenotazioneId)
    .single();
  type Row = {
    utente_id: string;
    data_check_in: string;
    data_check_out: string;
    users: { email: string } | null;
    camere: {
      nome: string;
      strutture: { nome: string } | null;
    } | null;
  };
  const r = data as unknown as Row | null;
  if (r) {
    const struttura = r.camere?.strutture?.nome ?? "B&B";
    const camera = r.camere?.nome ?? "";
    await notifyBookingStateChange({
      modulo: "B&B",
      stato,
      userId: r.utente_id,
      email: r.users?.email,
      riferimento: camera ? `${struttura} — ${camera}` : struttura,
      quando: `${r.data_check_in} → ${r.data_check_out}`,
      link: "/dashboard/prenotazioni",
    });
  }

  revalidatePath(`/dashboard/bnb/${strutturaId}/prenotazioni`);
  revalidatePath("/dashboard/prenotazioni");
  return {};
}

export async function updatePrenotazioneBnbPagamento(
  prenotazioneId: string,
  strutturaId: string,
  stato_pagamento: "in_attesa" | "pagato" | "fallito" | "rimborsato",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("prenotazioni_bnb")
    .update({ stato_pagamento })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/bnb/${strutturaId}/prenotazioni`);
  revalidatePath("/dashboard/prenotazioni");
  return {};
}

/**
 * Full update di una prenotazione B&B: stato + pagamento + dettagli (camera,
 * date, num_ospiti, note). Pensato per il modal "Modifica prenotazione" che
 * permette al gestore di cambiare tutto in un colpo solo. Nessun blocco di
 * stato — il gestore può tornare indietro a qualsiasi stato.
 */
export async function updatePrenotazioneBnbFull(
  prenotazioneId: string,
  strutturaId: string,
  input: {
    stato: "in_attesa" | "confermata" | "cancellata" | "completata" | "no_show";
    statoPagamento: "in_attesa" | "pagato" | "fallito" | "rimborsato";
    cameraId: string;
    dataCheckIn: string;
    dataCheckOut: string;
    numOspiti: number;
    note?: string;
  },
): Promise<{ error?: string }> {
  if (!input.dataCheckIn || !input.dataCheckOut)
    return { error: "Date obbligatorie" };
  if (input.dataCheckOut <= input.dataCheckIn)
    return { error: "Check-out deve essere dopo il check-in" };
  if (!Number.isFinite(input.numOspiti) || input.numOspiti < 1)
    return { error: "Numero ospiti non valido" };

  const supabase = await createClient();

  // Verifica camera nella struttura.
  const { data: cam } = await supabase
    .from("camere")
    .select("struttura_id")
    .eq("id", input.cameraId)
    .single();
  if (!cam) return { error: "Camera non trovata" };
  if ((cam as { struttura_id: string }).struttura_id !== strutturaId)
    return { error: "Camera non appartiene a questa struttura" };

  const { error } = await supabase
    .from("prenotazioni_bnb")
    .update({
      stato: input.stato,
      stato_pagamento: input.statoPagamento,
      camera_id: input.cameraId,
      data_check_in: input.dataCheckIn,
      data_check_out: input.dataCheckOut,
      num_ospiti: input.numOspiti,
      note: input.note?.trim() || null,
    })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/bnb/${strutturaId}/prenotazioni`);
  revalidatePath("/dashboard/prenotazioni");
  return {};
}

export async function updatePrenotazioneBnbCamera(
  prenotazioneId: string,
  strutturaId: string,
  cameraId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();

  // Verifica che la nuova camera appartenga alla stessa struttura (anti-tamper).
  const { data: cam } = await supabase
    .from("camere")
    .select("struttura_id")
    .eq("id", cameraId)
    .single();
  if (!cam) return { error: "Camera non trovata" };
  if ((cam as { struttura_id: string }).struttura_id !== strutturaId)
    return { error: "Camera non appartiene a questa struttura" };

  const { error } = await supabase
    .from("prenotazioni_bnb")
    .update({ camera_id: cameraId })
    .eq("id", prenotazioneId);
  if (error) return { error: error.message };

  revalidatePath(`/dashboard/bnb/${strutturaId}/prenotazioni`);
  revalidatePath("/dashboard/prenotazioni");
  return {};
}
