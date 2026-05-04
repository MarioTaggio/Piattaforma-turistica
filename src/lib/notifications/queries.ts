import "server-only";

import { createClient } from "@/lib/supabase/server";

export type NotificaTipo = "info" | "successo" | "avviso" | "errore";

export type Notifica = {
  id: string;
  user_id: string;
  titolo: string;
  messaggio: string | null;
  tipo: NotificaTipo;
  letta: boolean;
  link: string | null;
  created_at: string;
};

const PAGE_SIZE = 15;

export async function getRecentNotifications(): Promise<{
  notifications: Notifica[];
  unreadCount: number;
}> {
  // Defensive: if the `notifiche` table or RLS policies aren't in place yet,
  // we don't want the entire dashboard to 500. Fall back to an empty inbox.
  try {
    const supabase = await createClient();

    const [listRes, countRes] = await Promise.all([
      supabase
        .from("notifiche")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE),
      supabase
        .from("notifiche")
        .select("*", { count: "exact", head: true })
        .eq("letta", false),
    ]);

    if (listRes.error || countRes.error) {
      console.warn(
        "[notifications] query failed, returning empty:",
        listRes.error?.message ?? countRes.error?.message,
      );
      return { notifications: [], unreadCount: 0 };
    }

    return {
      notifications: (listRes.data as unknown as Notifica[]) ?? [],
      unreadCount: countRes.count ?? 0,
    };
  } catch (err) {
    console.warn("[notifications] unexpected error:", err);
    return { notifications: [], unreadCount: 0 };
  }
}
