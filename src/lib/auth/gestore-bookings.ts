import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export type GestoreBookingsFlags = {
  eventi: boolean;
  bnb: boolean;
  ristoranti: boolean;
};

const empty: GestoreBookingsFlags = {
  eventi: false,
  bnb: false,
  ristoranti: false,
};

/**
 * Per ogni modulo "gestore con prenotazioni" (eventi, bnb, ristoranti),
 * indica se l'utente possiede almeno un contenuto con
 * `prenotazione_attiva = true`. Usato dalla sidebar per decidere se
 * mostrare la voce "Prenotazioni" sotto al modulo: se nessun contenuto
 * ha prenotazioni attive, mostrarla sarebbe rumore.
 *
 * Best-effort: in caso d'errore tutto false (la sidebar nasconde le voci).
 */
export async function getGestoreBookingsFlags(
  userId: string,
): Promise<GestoreBookingsFlags> {
  try {
    const admin = createAdminClient();
    const hasAny = (table: string) =>
      admin
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("gestore_id", userId)
        .eq("prenotazione_attiva", true)
        .then((r) => (r.count ?? 0) > 0);

    const [eventi, bnb, ristoranti] = await Promise.all([
      hasAny("eventi"),
      hasAny("strutture"),
      hasAny("ristoranti"),
    ]);

    return { eventi, bnb, ristoranti };
  } catch (err) {
    console.warn("[gestore-bookings] failed:", err);
    return empty;
  }
}
