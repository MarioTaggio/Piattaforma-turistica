import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificaTipo } from "./queries";

type CreateNotificaInput = {
  userId: string;
  titolo: string;
  messaggio?: string;
  tipo?: NotificaTipo;
  link?: string;
};

/**
 * Inserisce una notifica per un utente. Best-effort: non solleva eccezione,
 * logga e ritorna `false` in caso di errore così la chiamata principale
 * (es. cambio stato prenotazione) non si rompe se il sottosistema notifiche
 * è temporaneamente indisponibile.
 */
export async function createNotifica(
  input: CreateNotificaInput,
): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifiche").insert({
      user_id: input.userId,
      titolo: input.titolo,
      messaggio: input.messaggio ?? null,
      tipo: input.tipo ?? "info",
      link: input.link ?? null,
    });
    if (error) {
      console.warn("[notifications] insert failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[notifications] unexpected error:", err);
    return false;
  }
}

/**
 * Inserisce notifiche multiple in un colpo solo.
 */
export async function createNotificheBulk(
  items: CreateNotificaInput[],
): Promise<boolean> {
  if (items.length === 0) return true;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("notifiche").insert(
      items.map((i) => ({
        user_id: i.userId,
        titolo: i.titolo,
        messaggio: i.messaggio ?? null,
        tipo: i.tipo ?? "info",
        link: i.link ?? null,
      })),
    );
    if (error) {
      console.warn("[notifications] bulk insert failed:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[notifications] unexpected error:", err);
    return false;
  }
}
