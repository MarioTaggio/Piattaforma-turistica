"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionUser } from "@/lib/auth/dal";

export type SearchHit = {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type SearchGroup = {
  category: string;
  hits: SearchHit[];
};

const PER_GROUP = 3;

/**
 * Ricerca globale ILIKE su tutte le entità pubbliche.
 * - Per utenti: solo contenuti `pubblicato`.
 * - Per admin: include anche utenti, gestori (e bypass stato).
 *
 * Best-effort: se una singola query fallisce, la sua categoria torna vuota
 * ma le altre comunque arrivano.
 */
export async function globalSearch(query: string): Promise<SearchGroup[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const me = await getSessionUser();
  const isAdmin = me?.roles.includes("admin") ?? false;

  const admin = createAdminClient();
  const like = `%${q.replace(/[%_]/g, "")}%`;

  const baseQuery = (
    table: string,
    titleCol: string,
    subtitleCol: string | null,
  ) => {
    let qb = admin
      .from(table)
      .select(
        `id, ${titleCol}${subtitleCol ? `, ${subtitleCol}` : ""}, stato`,
      )
      .ilike(titleCol, like)
      .limit(PER_GROUP);
    if (!isAdmin) qb = qb.eq("stato", "pubblicato");
    return qb;
  };

  type Row = Record<string, unknown>;
  const groups: SearchGroup[] = [];

  // Eventi
  {
    const { data } = await baseQuery("eventi", "titolo", "citta");
    const hits = ((data ?? []) as unknown as Row[]).map((r) => ({
      id: String(r.id),
      title: String(r.titolo ?? ""),
      subtitle: (r.citta as string | null) ?? undefined,
      href: `/eventi/${r.id}`,
    }));
    if (hits.length > 0) groups.push({ category: "Eventi", hits });
  }

  // B&B (strutture)
  {
    const { data } = await baseQuery("strutture", "nome", "citta");
    const hits = ((data ?? []) as unknown as Row[]).map((r) => ({
      id: String(r.id),
      title: String(r.nome ?? ""),
      subtitle: (r.citta as string | null) ?? undefined,
      href: `/bnb/${r.id}`,
    }));
    if (hits.length > 0) groups.push({ category: "B&B", hits });
  }

  // Ristoranti
  {
    const { data } = await baseQuery("ristoranti", "nome", "citta");
    const hits = ((data ?? []) as unknown as Row[]).map((r) => ({
      id: String(r.id),
      title: String(r.nome ?? ""),
      subtitle: (r.citta as string | null) ?? undefined,
      href: `/ristoranti/${r.id}`,
    }));
    if (hits.length > 0) groups.push({ category: "Ristoranti", hits });
  }

  // Prodotti shop — link allo shop padre
  {
    let qb = admin
      .from("shop_prodotti")
      .select("id, nome, shop_id, shops:shop_id ( nome, stato )")
      .ilike("nome", like)
      .limit(PER_GROUP);
    if (!isAdmin) qb = qb.eq("disponibile", true);
    const { data } = await qb;
    type ShopProdRow = {
      id: string;
      nome: string;
      shop_id: string;
      shops: { nome: string; stato: string } | null;
    };
    const filtered = ((data ?? []) as unknown as ShopProdRow[]).filter(
      (r) => isAdmin || r.shops?.stato === "pubblicato",
    );
    const hits = filtered.map((r) => ({
      id: r.id,
      title: r.nome,
      subtitle: r.shops?.nome ?? undefined,
      href: `/shop/${r.shop_id}`,
    }));
    if (hits.length > 0) groups.push({ category: "Prodotti", hits });
  }

  // Corsi
  {
    const { data } = await baseQuery("corsi", "titolo", null);
    const hits = ((data ?? []) as unknown as Row[]).map((r) => ({
      id: String(r.id),
      title: String(r.titolo ?? ""),
      href: `/videolezioni/${r.id}`,
    }));
    if (hits.length > 0) groups.push({ category: "Corsi", hits });
  }

  // Attrazioni (infopoint)
  {
    const { data } = await baseQuery("attrazioni", "nome", "citta");
    const hits = ((data ?? []) as unknown as Row[]).map((r) => ({
      id: String(r.id),
      title: String(r.nome ?? ""),
      subtitle: (r.citta as string | null) ?? undefined,
      href: `/infopoint/${r.id}`,
    }));
    if (hits.length > 0) groups.push({ category: "Attrazioni", hits });
  }

  // Solo admin: utenti + gestori
  if (isAdmin) {
    const { data: users } = await admin
      .from("users")
      .select("id, nome, cognome, email")
      .or(`nome.ilike.${like},cognome.ilike.${like},email.ilike.${like}`)
      .limit(PER_GROUP);
    type U = {
      id: string;
      nome: string | null;
      cognome: string | null;
      email: string;
    };
    const userHits = ((users ?? []) as U[]).map((u) => ({
      id: u.id,
      title:
        [u.nome, u.cognome].filter(Boolean).join(" ").trim() || u.email,
      subtitle: u.email,
      href: `/dashboard/admin/utenti/${u.id}`,
    }));
    if (userHits.length > 0)
      groups.push({ category: "Utenti", hits: userHits });

    // Gestori = utenti con almeno un ruolo gestore_*
    const { data: gestoriRows } = await admin
      .from("user_roles")
      .select("user_id, role, users:user_id ( nome, cognome, email )")
      .like("role", "gestore_%")
      .limit(20);
    type G = {
      user_id: string;
      users: { nome: string | null; cognome: string | null; email: string } | null;
    };
    const gestori = ((gestoriRows ?? []) as unknown as G[])
      .filter((g) => {
        const u = g.users;
        if (!u) return false;
        const haystack = `${u.nome ?? ""} ${u.cognome ?? ""} ${u.email}`.toLowerCase();
        return haystack.includes(q.toLowerCase());
      })
      .slice(0, PER_GROUP);
    const gestoriHits = gestori.map((g) => ({
      id: g.user_id,
      title:
        [g.users?.nome, g.users?.cognome].filter(Boolean).join(" ").trim() ||
        g.users?.email ||
        "Gestore",
      subtitle: g.users?.email ?? undefined,
      href: `/dashboard/admin/gestori/${g.user_id}`,
    }));
    if (gestoriHits.length > 0)
      groups.push({ category: "Gestori", hits: gestoriHits });
  }

  return groups;
}
