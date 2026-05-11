import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StatoRecensione } from "@/types/database";

export type RecensioneTargetKey =
  | "evento_id"
  | "struttura_id"
  | "ristorante_id"
  | "prodotto_id"
  | "corso_id"
  | "attrazione_id";

export type PublicRecensione = {
  id: string;
  user_id: string;
  voto: number;
  titolo: string;
  testo: string;
  stato: StatoRecensione;
  risposta_gestore: string | null;
  risposta_data: string | null;
  motivazione_rifiuto: string | null;
  created_at: string;
  user: {
    nome: string | null;
    cognome: string | null;
    avatar_url: string | null;
  } | null;
};

export type RatingSummary = {
  count: number;
  average: number; // 0 se nessuna recensione approvata
};

/**
 * Recensioni approvate per un contenuto (uso pubblico).
 */
export async function getApprovedRecensioni(
  targetKey: RecensioneTargetKey,
  targetId: string,
): Promise<PublicRecensione[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recensioni")
    .select(
      `id, user_id, voto, titolo, testo, stato,
       risposta_gestore, risposta_data, motivazione_rifiuto, created_at,
       user:user_id (nome, cognome, avatar_url)`,
    )
    .eq(targetKey, targetId)
    .eq("stato", "approvata")
    .order("created_at", { ascending: false });
  return ((data ?? []) as unknown) as PublicRecensione[];
}

/**
 * Media voto + count tra le recensioni approvate.
 */
export async function getRatingSummary(
  targetKey: RecensioneTargetKey,
  targetId: string,
): Promise<RatingSummary> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("recensioni")
    .select("voto")
    .eq(targetKey, targetId)
    .eq("stato", "approvata");
  const rows = (data ?? []) as { voto: number }[];
  if (rows.length === 0) return { count: 0, average: 0 };
  const sum = rows.reduce((acc, r) => acc + r.voto, 0);
  return {
    count: rows.length,
    average: Math.round((sum / rows.length) * 10) / 10,
  };
}

/**
 * Media voto + count per batch di target dello stesso tipo. Utile per
 * arricchire le card del catalogo senza N+1 queries.
 */
export async function getRatingSummariesBatch(
  targetKey: RecensioneTargetKey,
  ids: string[],
): Promise<Map<string, RatingSummary>> {
  const map = new Map<string, RatingSummary>();
  if (ids.length === 0) return map;
  const supabase = await createClient();
  const { data } = await supabase
    .from("recensioni")
    .select(`${targetKey}, voto`)
    .in(targetKey, ids)
    .eq("stato", "approvata");
  const rows = ((data ?? []) as unknown) as Array<
    Record<string, string | number>
  >;
  const buckets = new Map<string, number[]>();
  for (const r of rows) {
    const tid = String(r[targetKey]);
    const arr = buckets.get(tid) ?? [];
    arr.push(Number(r.voto));
    buckets.set(tid, arr);
  }
  for (const [tid, votes] of buckets) {
    const sum = votes.reduce((a, b) => a + b, 0);
    map.set(tid, {
      count: votes.length,
      average: Math.round((sum / votes.length) * 10) / 10,
    });
  }
  return map;
}

/**
 * Recensione esistente dell'utente loggato per un contenuto. Usata dal form
 * pubblico per mostrare lo stato in cui si trova la recensione (o per
 * impedire un secondo invio).
 */
export async function getRecensioneByMe(
  targetKey: RecensioneTargetKey,
  targetId: string,
): Promise<PublicRecensione | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("recensioni")
    .select(
      `id, user_id, voto, titolo, testo, stato,
       risposta_gestore, risposta_data, motivazione_rifiuto, created_at,
       user:user_id (nome, cognome, avatar_url)`,
    )
    .eq(targetKey, targetId)
    .eq("user_id", user.id)
    .maybeSingle();
  return ((data as unknown) as PublicRecensione | null) ?? null;
}

/**
 * Verifica eligibilità dell'utente loggato a recensire un contenuto.
 * Regole:
 *   - evento: deve avere almeno un biglietto valido o utilizzato
 *   - struttura: almeno una prenotazione_bnb confermata o completata
 *   - ristorante: almeno una prenotazione_tavolo confermata o completata
 *   - prodotto: almeno un ordine_shop_item con ordine consegnato
 *   - corso: deve aver acquistato (acquisti_video)
 *   - attrazione: deve avere una prenotazione_visita confermata/completata
 *     su una visita di quella attrazione
 */
export async function canUserReview(
  targetKey: RecensioneTargetKey,
  targetId: string,
): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  // Usiamo l'admin client per bypassare eventuali RLS dei moduli singoli
  // (servono solo letture aggregate).
  const admin = createAdminClient();

  switch (targetKey) {
    case "evento_id": {
      const { count } = await admin
        .from("biglietti")
        .select("id", { count: "exact", head: true })
        .eq("evento_id", targetId)
        .eq("utente_id", user.id)
        .in("stato", ["valido", "utilizzato"]);
      return (count ?? 0) > 0;
    }
    case "struttura_id": {
      const { data: cams } = await admin
        .from("camere")
        .select("id")
        .eq("struttura_id", targetId);
      const camIds = ((cams ?? []) as { id: string }[]).map((c) => c.id);
      if (camIds.length === 0) return false;
      const { count } = await admin
        .from("prenotazioni_bnb")
        .select("id", { count: "exact", head: true })
        .eq("utente_id", user.id)
        .in("camera_id", camIds)
        .in("stato", ["confermata", "completata"]);
      return (count ?? 0) > 0;
    }
    case "ristorante_id": {
      const { data: tavs } = await admin
        .from("tavoli")
        .select("id")
        .eq("ristorante_id", targetId);
      const tavIds = ((tavs ?? []) as { id: string }[]).map((t) => t.id);
      if (tavIds.length === 0) return false;
      const { count } = await admin
        .from("prenotazioni_tavolo")
        .select("id", { count: "exact", head: true })
        .eq("utente_id", user.id)
        .in("tavolo_id", tavIds)
        .in("stato", ["confermata", "completata"]);
      return (count ?? 0) > 0;
    }
    case "prodotto_id": {
      const { data: rows } = await admin
        .from("ordini_shop_prodotti")
        .select("ordini_shop!inner(utente_id, stato)")
        .eq("prodotto_id", targetId);
      const items = ((rows ?? []) as unknown) as Array<{
        ordini_shop: { utente_id: string; stato: string };
      }>;
      return items.some(
        (i) =>
          i.ordini_shop?.utente_id === user.id &&
          i.ordini_shop?.stato === "consegnato",
      );
    }
    case "corso_id": {
      const { count } = await admin
        .from("acquisti_video")
        .select("corso_id", { count: "exact", head: true })
        .eq("corso_id", targetId)
        .eq("utente_id", user.id);
      return (count ?? 0) > 0;
    }
    case "attrazione_id": {
      const { data: vis } = await admin
        .from("visite_guidate")
        .select("id")
        .eq("attrazione_id", targetId);
      const visIds = ((vis ?? []) as { id: string }[]).map((v) => v.id);
      if (visIds.length === 0) return false;
      const { count } = await admin
        .from("prenotazioni_visita")
        .select("id", { count: "exact", head: true })
        .eq("utente_id", user.id)
        .in("visita_id", visIds)
        .in("stato", ["confermata", "completata"]);
      return (count ?? 0) > 0;
    }
  }
}

/**
 * Lista recensioni per il gestore di un contenuto. Include tutti gli stati.
 */
export async function getRecensioniForOwner(input: {
  targetKey: RecensioneTargetKey;
  targetId: string;
  stato?: StatoRecensione | "tutte";
}): Promise<PublicRecensione[]> {
  const admin = createAdminClient();
  let q = admin
    .from("recensioni")
    .select(
      `id, user_id, voto, titolo, testo, stato,
       risposta_gestore, risposta_data, motivazione_rifiuto, created_at,
       user:user_id (nome, cognome, avatar_url)`,
    )
    .eq(input.targetKey, input.targetId)
    .order("created_at", { ascending: false });
  if (input.stato && input.stato !== "tutte") q = q.eq("stato", input.stato);
  const { data } = await q;
  return ((data ?? []) as unknown) as PublicRecensione[];
}
