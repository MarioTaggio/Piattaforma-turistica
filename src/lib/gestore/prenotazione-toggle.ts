"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";

async function tErrors() {
  return getTranslations("errors");
}

type Tabella = "eventi" | "strutture" | "ristoranti";

const PATHS: Record<Tabella, (id: string) => string[]> = {
  eventi: (id) => [`/dashboard/eventi/${id}`, `/eventi/${id}`, "/eventi"],
  strutture: (id) => [`/dashboard/bnb/${id}`, `/bnb/${id}`, "/bnb"],
  ristoranti: (id) => [
    `/dashboard/ristoranti/${id}`,
    `/ristoranti/${id}`,
    "/ristoranti",
  ],
};

// Toggle `prenotazione_attiva` su una delle 3 tabelle. Verifica ownership
// (gestore_id = user) lato server prima di scrivere; admin bypassa.
export async function setPrenotazioneAttiva(input: {
  tabella: Tabella;
  id: string;
  value: boolean;
}): Promise<{ error?: string; ok?: true }> {
  const { tabella, id, value } = input;

  const user = await requireUser();
  const admin = createAdminClient();

  const { data: row, error: fetchErr } = await admin
    .from(tabella)
    .select("gestore_id")
    .eq("id", id)
    .maybeSingle();

  if (fetchErr) return { error: fetchErr.message };
  if (!row) return { error: (await tErrors())("contentNotFound") };

  const ownerId = (row as { gestore_id: string }).gestore_id;
  const isAdmin = user.roles.includes("admin");
  if (ownerId !== user.id && !isAdmin) return { error: (await tErrors())("notAuthorized") };

  const { error } = await admin
    .from(tabella)
    .update({ prenotazione_attiva: value })
    .eq("id", id);

  if (error) return { error: error.message };

  for (const p of PATHS[tabella](id)) revalidatePath(p);
  return { ok: true };
}
