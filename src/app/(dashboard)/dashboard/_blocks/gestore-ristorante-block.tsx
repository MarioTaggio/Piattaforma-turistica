import {
  UtensilsCrossed,
  Users,
  ClipboardCheck,
  Wallet,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";

import {
  BlockHeader,
  BlockShell,
  CardList,
  ListRow,
  MiniStat,
  StatGrid,
} from "./_section";

const ACCENT = "green" as const;

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfTodayIso(): string {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export async function GestoreRistoranteBlock({ userId }: { userId: string }) {
  const supabase = createAdminClient();
  const todayStart = startOfTodayIso();
  const todayEnd = endOfTodayIso();
  const monthStart = startOfMonthIso();

  const { data: ristorantiRows } = await supabase
    .from("ristoranti")
    .select("id, nome")
    .eq("gestore_id", userId);

  const ristoranti = (ristorantiRows ?? []) as { id: string; nome: string }[];
  const ristorantiNomeById = new Map(ristoranti.map((r) => [r.id, r.nome]));
  const ristorantiIds = ristoranti.map((r) => r.id);

  const { data: tavoliRows } = ristorantiIds.length
    ? await supabase
        .from("tavoli")
        .select("id, numero, posti, ristorante_id")
        .in("ristorante_id", ristorantiIds)
    : { data: [] as { id: string; numero: string; posti: number; ristorante_id: string }[] };

  type TavoloRow = {
    id: string;
    numero: string;
    posti: number;
    ristorante_id: string;
  };
  const tavoli = (tavoliRows ?? []) as TavoloRow[];
  const tavoloById = new Map(tavoli.map((t) => [t.id, t]));
  const tavoliIds = tavoli.map((t) => t.id);

  const [
    prenOggiRes,
    prenInAttesaRes,
    revenueRes,
    prenOggiOrdinateRes,
  ] =
    tavoliIds.length === 0
      ? [
          { data: [] as { num_ospiti: number }[], count: 0 },
          { count: 0 },
          { data: [] as { totale_cents: number }[] },
          { data: [] as unknown[] },
        ]
      : await Promise.all([
          supabase
            .from("prenotazioni_tavolo")
            .select("num_ospiti", { count: "exact" })
            .in("tavolo_id", tavoliIds)
            .gte("data_ora", todayStart)
            .lte("data_ora", todayEnd)
            .in("stato", ["in_attesa", "confermata"]),
          supabase
            .from("prenotazioni_tavolo")
            .select("*", { count: "exact", head: true })
            .in("tavolo_id", tavoliIds)
            .eq("stato", "in_attesa"),
          ristorantiIds.length === 0
            ? Promise.resolve({ data: [] as { totale_cents: number }[] })
            : supabase
                .from("ordini")
                .select("totale_cents")
                .in("ristorante_id", ristorantiIds)
                .gte("created_at", monthStart)
                .neq("stato", "annullato"),
          supabase
            .from("prenotazioni_tavolo")
            .select(
              "id, data_ora, num_ospiti, stato, tavolo_id, users(nome, cognome, email)",
            )
            .in("tavolo_id", tavoliIds)
            .gte("data_ora", todayStart)
            .lte("data_ora", todayEnd)
            .order("data_ora", { ascending: true })
            .limit(8),
        ]);

  const prenOggi = prenOggiRes.count ?? 0;
  const copertiOggi = (
    (prenOggiRes.data ?? []) as { num_ospiti: number }[]
  ).reduce((s, r) => s + (r.num_ospiti ?? 0), 0);
  const inAttesa = prenInAttesaRes.count ?? 0;
  const revenueMese = (
    (revenueRes.data ?? []) as { totale_cents: number }[]
  ).reduce((s, r) => s + (r.totale_cents ?? 0), 0);

  type PrenOggi = {
    id: string;
    data_ora: string;
    num_ospiti: number;
    stato: string;
    tavolo_id: string;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  };
  const prenOggiList = (
    (prenOggiOrdinateRes.data ?? []) as unknown as PrenOggi[]
  ).filter(Boolean);

  return (
    <BlockShell accent={ACCENT}>
      <BlockHeader
        emoji="🍽️"
        title="Gestione Ristoranti"
        accent={ACCENT}
        href="/dashboard/ristoranti"
        hrefLabel="Vai ai ristoranti"
      />

      <StatGrid>
        <MiniStat
          label="Prenotazioni oggi"
          value={formatNumber(prenOggi)}
          icon={ClipboardCheck}
          accent={ACCENT}
        />
        <MiniStat
          label="Coperti totali"
          value={formatNumber(copertiOggi)}
          icon={Users}
          accent={ACCENT}
          hint="Persone attese oggi"
        />
        <MiniStat
          label="In attesa"
          value={formatNumber(inAttesa)}
          icon={UtensilsCrossed}
          accent={ACCENT}
          hint="Da confermare"
        />
        <MiniStat
          label="Revenue del mese"
          value={formatEurFromCents(revenueMese)}
          icon={Wallet}
          accent={ACCENT}
          hint="Ordini ristorante"
        />
      </StatGrid>

      <CardList
        title="Prenotazioni di oggi"
        description="In ordine di orario."
        accent={ACCENT}
        href="/dashboard/ristoranti"
        isEmpty={prenOggiList.length === 0}
        emptyText="Nessuna prenotazione per oggi."
      >
        {prenOggiList.map((p) => {
          const tav = tavoloById.get(p.tavolo_id);
          const utente = p.users
            ? [p.users.nome, p.users.cognome].filter(Boolean).join(" ") ||
              p.users.email
            : "—";
          const rist = tav ? ristorantiNomeById.get(tav.ristorante_id) : null;
          return (
            <ListRow
              key={p.id}
              primary={`${utente} · ${p.num_ospiti} ospit${p.num_ospiti === 1 ? "e" : "i"}`}
              secondary={`${rist ?? "Ristorante"} · Tavolo ${tav?.numero ?? "?"}`}
              trailing={formatDateTime(p.data_ora)}
              href="/dashboard/ristoranti"
            />
          );
        })}
      </CardList>
    </BlockShell>
  );
}
