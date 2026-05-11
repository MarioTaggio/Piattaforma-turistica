"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Salva il progresso di una lezione video. Best-effort — gli errori non
 * bloccano la riproduzione.
 */
export async function saveVideoProgress(input: {
  lezioneId: string;
  secondiVisti: number;
  completata?: boolean;
}): Promise<{ ok?: true; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non autenticato" };

  const secondi = Math.max(0, Math.floor(input.secondiVisti));

  const { error } = await supabase
    .from("video_progressi")
    .upsert(
      {
        user_id: user.id,
        lezione_id: input.lezioneId,
        secondi_visti: secondi,
        completata: input.completata ?? false,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,lezione_id" },
    );

  if (error) return { error: error.message };
  return { ok: true };
}

export async function getVideoProgress(
  lezioneId: string,
): Promise<{ secondi: number; completata: boolean } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("video_progressi")
    .select("secondi_visti, completata")
    .eq("user_id", user.id)
    .eq("lezione_id", lezioneId)
    .maybeSingle();

  const row = data as { secondi_visti: number; completata: boolean } | null;
  if (!row) return null;
  return { secondi: row.secondi_visti, completata: row.completata };
}
