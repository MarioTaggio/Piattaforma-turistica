import {
  Users,
  UserPlus,
  Wallet,
  PlayCircle,
  Trophy,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import {
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

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export async function GestoreVideoBlock({ userId }: { userId: string }) {
  const supabase = createAdminClient();
  const monthStart = startOfMonthIso();

  const { data: corsiRows } = await supabase
    .from("corsi")
    .select("id, titolo, prezzo_cents, stato")
    .eq("gestore_id", userId);

  type CorsoRow = {
    id: string;
    titolo: string;
    prezzo_cents: number;
    stato: string;
  };
  const corsi = (corsiRows ?? []) as CorsoRow[];
  const corsoById = new Map(corsi.map((c) => [c.id, c]));
  const corsiIds = corsi.map((c) => c.id);
  const corsiAttivi = corsi.filter((c) => c.stato === "pubblicato");

  if (corsiIds.length === 0) {
    return (
      <BlockShell accent={ACCENT}>
        <BlockHeader
          emoji="🎬"
          title="Gestione Video"
          accent={ACCENT}
          href="/dashboard/video"
        />
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Non hai ancora pubblicato corsi. Vai alla{" "}
          <a className="underline" href="/dashboard/video">
            gestione video
          </a>{" "}
          per crearne uno.
        </p>
      </BlockShell>
    );
  }

  const [
    { count: iscrittiTotali },
    { count: nuoviIscritti },
    revenueRes,
    iscrizioniPerCorsoRes,
  ] = await Promise.all([
    supabase
      .from("acquisti_video")
      .select("*", { count: "exact", head: true })
      .in("corso_id", corsiIds),
    supabase
      .from("acquisti_video")
      .select("*", { count: "exact", head: true })
      .in("corso_id", corsiIds)
      .gte("created_at", monthStart),
    supabase
      .from("acquisti_video")
      .select("prezzo_pagato_cents")
      .in("corso_id", corsiIds)
      .gte("created_at", monthStart),
    supabase
      .from("acquisti_video")
      .select("corso_id")
      .in("corso_id", corsiIds),
  ]);

  const revenueMese = (
    (revenueRes.data ?? []) as { prezzo_pagato_cents: number }[]
  ).reduce((s, r) => s + (r.prezzo_pagato_cents ?? 0), 0);

  const iscrizioniPerCorso = new Map<string, number>();
  for (const r of (iscrizioniPerCorsoRes.data ?? []) as { corso_id: string }[]) {
    iscrizioniPerCorso.set(
      r.corso_id,
      (iscrizioniPerCorso.get(r.corso_id) ?? 0) + 1,
    );
  }
  const top3 = corsi
    .map((c) => ({
      ...c,
      iscritti: iscrizioniPerCorso.get(c.id) ?? 0,
    }))
    .sort((a, b) => b.iscritti - a.iscritti)
    .slice(0, 3);

  void corsoById;

  return (
    <BlockShell accent={ACCENT}>
      <BlockHeader
        emoji="🎬"
        title="Gestione Video"
        accent={ACCENT}
        href="/dashboard/video"
        hrefLabel="Vai ai corsi"
      />

      <StatGrid>
        <MiniStat
          label="Iscritti totali"
          value={formatNumber(iscrittiTotali ?? 0)}
          icon={Users}
          accent={ACCENT}
        />
        <MiniStat
          label="Nuovi del mese"
          value={formatNumber(nuoviIscritti ?? 0)}
          icon={UserPlus}
          accent={ACCENT}
        />
        <MiniStat
          label="Revenue del mese"
          value={formatEurFromCents(revenueMese)}
          icon={Wallet}
          accent={ACCENT}
        />
        <MiniStat
          label="Corsi attivi"
          value={formatNumber(corsiAttivi.length)}
          icon={PlayCircle}
          accent={ACCENT}
          hint={`Su ${formatNumber(corsi.length)} totali`}
        />
      </StatGrid>

      <CardList
        title="Top corsi per iscritti"
        description="I tuoi 3 corsi con più studenti."
        accent={ACCENT}
        href="/dashboard/video"
        isEmpty={top3.length === 0}
        emptyText="Nessun dato disponibile."
      >
        {top3.map((c, i) => (
          <ListRow
            key={c.id}
            primary={
              <span className="flex items-center gap-1.5">
                <Trophy
                  className={`size-3.5 ${i === 0 ? "text-amber-500" : "text-muted-foreground"}`}
                />
                {c.titolo}
              </span>
            }
            secondary={`Prezzo: ${formatEurFromCents(c.prezzo_cents)} · ${c.stato}`}
            trailing={`${formatNumber(c.iscritti)} iscritti`}
            href={`/dashboard/video/${c.id}`}
          />
        ))}
      </CardList>
    </BlockShell>
  );
}
