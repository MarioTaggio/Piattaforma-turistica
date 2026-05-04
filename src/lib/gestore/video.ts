"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  corsoSchema,
  lezioneSchema,
  type CorsoInput,
  type LezioneInput,
} from "./video-schemas";

type Result = { error: string } | { success: true; id: string };

async function recomputeDurata(corsoId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("video_lezioni")
    .select("durata_secondi")
    .eq("corso_id", corsoId);
  const total = ((data ?? []) as { durata_secondi: number }[]).reduce(
    (s, r) => s + r.durata_secondi,
    0,
  );
  await supabase
    .from("corsi")
    .update({ durata_totale_secondi: total })
    .eq("id", corsoId);
}

export async function createCorso(input: CorsoInput): Promise<Result> {
  const parsed = corsoSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  const v = parsed.data;
  const { data, error } = await supabase
    .from("corsi")
    .insert({
      gestore_id: user.id,
      titolo: v.titolo,
      descrizione: v.descrizione || null,
      prezzo_cents: v.prezzo_cents,
      immagine_copertina: v.immagine_copertina || null,
      livello: v.livello ?? null,
      stato: v.stato,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/dashboard/video");
  return { success: true, id: (data as { id: string }).id };
}

export async function updateCorso(
  id: string,
  input: CorsoInput,
): Promise<Result> {
  const parsed = corsoSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("corsi")
    .update({
      titolo: v.titolo,
      descrizione: v.descrizione || null,
      prezzo_cents: v.prezzo_cents,
      immagine_copertina: v.immagine_copertina || null,
      livello: v.livello ?? null,
      stato: v.stato,
    })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/video");
  revalidatePath(`/dashboard/video/${id}`);
  return { success: true, id };
}

export async function deleteCorso(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase.from("corsi").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/video");
  return {};
}

export async function createLezione(
  corsoId: string,
  input: LezioneInput,
): Promise<{ error?: string }> {
  const parsed = lezioneSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase.from("video_lezioni").insert({
    corso_id: corsoId,
    titolo: v.titolo,
    descrizione: v.descrizione || null,
    video_url: v.video_url,
    durata_secondi: v.durata_secondi,
    ordine: v.ordine,
    anteprima_gratuita: v.anteprima_gratuita,
  });
  if (error) return { error: error.message };
  await recomputeDurata(corsoId);
  revalidatePath(`/dashboard/video/${corsoId}`);
  return {};
}

export async function updateLezione(
  lezioneId: string,
  corsoId: string,
  input: LezioneInput,
): Promise<{ error?: string }> {
  const parsed = lezioneSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const v = parsed.data;
  const { error } = await supabase
    .from("video_lezioni")
    .update({
      titolo: v.titolo,
      descrizione: v.descrizione || null,
      video_url: v.video_url,
      durata_secondi: v.durata_secondi,
      ordine: v.ordine,
      anteprima_gratuita: v.anteprima_gratuita,
    })
    .eq("id", lezioneId);
  if (error) return { error: error.message };
  await recomputeDurata(corsoId);
  revalidatePath(`/dashboard/video/${corsoId}`);
  revalidatePath(`/dashboard/video/${corsoId}/lezioni`);
  return {};
}

/**
 * Sposta una lezione su (-1) o giù (+1) nell'ordine. Scambia `ordine` con la
 * lezione adiacente nello stesso corso. Idempotente al limite (no-op se già
 * in cima/fondo).
 */
export async function moveLezione(
  lezioneId: string,
  corsoId: string,
  direction: "up" | "down",
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: list } = await supabase
    .from("video_lezioni")
    .select("id, ordine")
    .eq("corso_id", corsoId)
    .order("ordine", { ascending: true });
  const items = (list ?? []) as { id: string; ordine: number }[];
  const idx = items.findIndex((l) => l.id === lezioneId);
  if (idx === -1) return { error: "Lezione non trovata" };

  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= items.length) return {}; // no-op

  const a = items[idx];
  const b = items[swapIdx];
  if (!a || !b) return {};

  // Scambia ordine. PostgREST non ha transazioni, due update sequenziali
  // (constraint UNIQUE(corso_id, ordine) richiede uno slot temporaneo).
  await supabase
    .from("video_lezioni")
    .update({ ordine: -1 })
    .eq("id", a.id);
  await supabase
    .from("video_lezioni")
    .update({ ordine: a.ordine })
    .eq("id", b.id);
  await supabase
    .from("video_lezioni")
    .update({ ordine: b.ordine })
    .eq("id", a.id);

  revalidatePath(`/dashboard/video/${corsoId}`);
  revalidatePath(`/dashboard/video/${corsoId}/lezioni`);
  return {};
}

export async function deleteLezione(
  lezioneId: string,
  corsoId: string,
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("video_lezioni")
    .delete()
    .eq("id", lezioneId);
  if (error) return { error: error.message };
  await recomputeDurata(corsoId);
  revalidatePath(`/dashboard/video/${corsoId}`);
  return {};
}
