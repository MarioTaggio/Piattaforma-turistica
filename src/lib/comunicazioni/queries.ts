import "server-only";

import { createClient } from "@/lib/supabase/server";

export type ComunicazioneRow = {
  id: string;
  oggetto: string;
  testo: string;
  letta: boolean;
  tipo_mittente: string | null;
  entita_nome: string | null;
  link: string | null;
  created_at: string;
  mittente: { nome: string | null; cognome: string | null } | null;
};

/**
 * Carica le ultime N comunicazioni del destinatario corrente per il dropdown
 * dell'header. Ritorna anche il count totale non lette per il badge.
 */
export async function getRecentComunicazioni(
  limit = 15,
): Promise<{ items: ComunicazioneRow[]; unreadCount: number }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { items: [], unreadCount: 0 };

  const [listResult, unreadResult] = await Promise.all([
    supabase
      .from("comunicazioni")
      .select(
        `id, oggetto, testo, letta, tipo_mittente, entita_nome, link, created_at,
         mittente:mittente_id ( nome, cognome )`,
      )
      .eq("destinatario_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("comunicazioni")
      .select("id", { count: "exact", head: true })
      .eq("destinatario_id", user.id)
      .eq("letta", false),
  ]);

  return {
    items: ((listResult.data ?? []) as unknown) as ComunicazioneRow[],
    unreadCount: unreadResult.count ?? 0,
  };
}
