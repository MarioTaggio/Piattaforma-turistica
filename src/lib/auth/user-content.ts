import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type UserContentCounts = {
  biglietti: number;
  prenotazioniBnb: number;
  prenotazioniTavolo: number;
  prenotazioniVisita: number;
  ordiniShop: number;
  ordiniRistorante: number;
  videoAcquistati: number;
  // Comunicazioni: total ricevute + non lette (badge sidebar)
  comunicazioni: number;
  comunicazioniUnread: number;
};

const empty: UserContentCounts = {
  biglietti: 0,
  prenotazioniBnb: 0,
  prenotazioniTavolo: 0,
  prenotazioniVisita: 0,
  ordiniShop: 0,
  ordiniRistorante: 0,
  videoAcquistati: 0,
  comunicazioni: 0,
  comunicazioniUnread: 0,
};

/**
 * Conta i contenuti dell'utente (biglietti, prenotazioni, ordini, video) per
 * decidere quali sezioni mostrare nella sidebar. Usa il service-role client
 * (count head) per evitare i RLS round-trip su utenti senza ruolo specifico.
 *
 * Best-effort: in caso di errore ritorna tutti zero (sidebar mostrerà solo
 * Profilo + Esplora, comportamento di fallback voluto).
 */
export async function getUserContentCounts(
  userId: string,
): Promise<UserContentCounts> {
  try {
    const admin = createAdminClient();
    const headCount = (table: string, filter?: Record<string, string>) =>
      admin
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("utente_id", userId)
        .match(filter ?? {})
        .then((r) => r.count ?? 0);

    // Comunicazioni usano `destinatario_id`, non `utente_id`: query separate.
    const comunicazioniHead = (filter?: Record<string, boolean>) =>
      admin
        .from("comunicazioni")
        .select("*", { count: "exact", head: true })
        .eq("destinatario_id", userId)
        .match(filter ?? {})
        .then((r) => r.count ?? 0);

    const [
      biglietti,
      prenotazioniBnb,
      prenotazioniTavolo,
      prenotazioniVisita,
      ordiniShop,
      ordiniRistorante,
      videoAcquistati,
      comunicazioni,
      comunicazioniUnread,
    ] = await Promise.all([
      headCount("biglietti"),
      headCount("prenotazioni_bnb"),
      headCount("prenotazioni_tavolo"),
      headCount("prenotazioni_visita"),
      headCount("ordini_shop"),
      headCount("ordini"),
      headCount("acquisti_video"),
      comunicazioniHead(),
      comunicazioniHead({ letta: false }),
    ]);

    return {
      biglietti,
      prenotazioniBnb,
      prenotazioniTavolo,
      prenotazioniVisita,
      ordiniShop,
      ordiniRistorante,
      videoAcquistati,
      comunicazioni,
      comunicazioniUnread,
    };
  } catch (err) {
    console.warn("[user-content] count failed:", err);
    return empty;
  }
}
