import {
  Hotel,
  CalendarCheck,
  CalendarX,
  Wallet,
  ClipboardCheck,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDate,
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

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

function addDaysDate(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export async function GestoreBnbBlock({ userId }: { userId: string }) {
  const supabase = createAdminClient();
  const today = todayDate();
  const monthStart = startOfMonthIso();

  // Strutture del gestore → camere → prenotazioni.
  const { data: struttureRows } = await supabase
    .from("strutture")
    .select("id, nome")
    .eq("gestore_id", userId);
  const strutture = (struttureRows ?? []) as { id: string; nome: string }[];
  const struttureNomeById = new Map(strutture.map((s) => [s.id, s.nome]));
  const struttureIds = strutture.map((s) => s.id);

  const { data: camereRows } = struttureIds.length
    ? await supabase
        .from("camere")
        .select("id, nome, struttura_id")
        .in("struttura_id", struttureIds)
    : { data: [] as { id: string; nome: string; struttura_id: string }[] };

  type CameraRow = { id: string; nome: string; struttura_id: string };
  const camere = (camereRows ?? []) as CameraRow[];
  const cameraById = new Map(camere.map((c) => [c.id, c]));
  const camereIds = camere.map((c) => c.id);

  if (camereIds.length === 0) {
    return (
      <BlockShell accent={ACCENT}>
        <BlockHeader
          emoji="🏨"
          title="Gestione B&B"
          accent={ACCENT}
          href="/dashboard/bnb"
        />
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Non hai ancora aggiunto camere alle tue strutture. Vai alla{" "}
          <a className="underline" href="/dashboard/bnb">
            gestione B&amp;B
          </a>{" "}
          per iniziare.
        </p>
      </BlockShell>
    );
  }

  const [
    { count: prenInAttesa },
    checkInOggiRes,
    checkOutOggiRes,
    revenueRes,
    daApprovareRes,
  ] = await Promise.all([
    supabase
      .from("prenotazioni_bnb")
      .select("*", { count: "exact", head: true })
      .in("camera_id", camereIds)
      .eq("stato", "in_attesa"),
    supabase
      .from("prenotazioni_bnb")
      .select("id, num_ospiti, camera_id, stato")
      .in("camera_id", camereIds)
      .eq("data_check_in", today)
      .in("stato", ["in_attesa", "confermata"]),
    supabase
      .from("prenotazioni_bnb")
      .select("id, num_ospiti, camera_id, stato")
      .in("camera_id", camereIds)
      .eq("data_check_out", today)
      .in("stato", ["in_attesa", "confermata"]),
    supabase
      .from("prenotazioni_bnb")
      .select("prezzo_totale_cents")
      .in("camera_id", camereIds)
      .gte("created_at", monthStart)
      .neq("stato", "cancellata"),
    supabase
      .from("prenotazioni_bnb")
      .select(
        "id, data_check_in, data_check_out, num_ospiti, prezzo_totale_cents, camera_id, users(nome, cognome, email)",
      )
      .in("camera_id", camereIds)
      .eq("stato", "in_attesa")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const checkInOggi = checkInOggiRes.data?.length ?? 0;
  const checkOutOggi = checkOutOggiRes.data?.length ?? 0;
  const revenueMese = (
    (revenueRes.data ?? []) as { prezzo_totale_cents: number }[]
  ).reduce((s, r) => s + (r.prezzo_totale_cents ?? 0), 0);

  type PrenAttesa = {
    id: string;
    data_check_in: string;
    data_check_out: string;
    num_ospiti: number;
    prezzo_totale_cents: number;
    camera_id: string;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  };
  const daApprovare = (daApprovareRes.data ?? []) as unknown as PrenAttesa[];

  // Calendario settimana — conta arrivi per ognuno dei prossimi 7 giorni.
  const { data: settimanaRows } = await supabase
    .from("prenotazioni_bnb")
    .select("data_check_in")
    .in("camera_id", camereIds)
    .gte("data_check_in", today)
    .lte("data_check_in", addDaysDate(7))
    .in("stato", ["in_attesa", "confermata"]);

  const settimana = (settimanaRows ?? []) as { data_check_in: string }[];
  const arriviPerGiorno = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    const d = addDaysDate(i);
    arriviPerGiorno.set(d, 0);
  }
  for (const r of settimana) {
    arriviPerGiorno.set(
      r.data_check_in,
      (arriviPerGiorno.get(r.data_check_in) ?? 0) + 1,
    );
  }
  void struttureNomeById;

  return (
    <BlockShell accent={ACCENT}>
      <BlockHeader
        emoji="🏨"
        title="Gestione B&B"
        accent={ACCENT}
        href="/dashboard/bnb"
        hrefLabel="Vai alle strutture"
      />

      <StatGrid>
        <MiniStat
          label="In attesa"
          value={formatNumber(prenInAttesa ?? 0)}
          icon={ClipboardCheck}
          accent={ACCENT}
          hint="Da confermare"
        />
        <MiniStat
          label="Check-in oggi"
          value={formatNumber(checkInOggi)}
          icon={CalendarCheck}
          accent={ACCENT}
        />
        <MiniStat
          label="Check-out oggi"
          value={formatNumber(checkOutOggi)}
          icon={CalendarX}
          accent={ACCENT}
        />
        <MiniStat
          label="Revenue del mese"
          value={formatEurFromCents(revenueMese)}
          icon={Wallet}
          accent={ACCENT}
        />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <CardList
          title="Prenotazioni da approvare"
          description="Gestisci le richieste in attesa."
          accent={ACCENT}
          href="/dashboard/bnb"
          isEmpty={daApprovare.length === 0}
          emptyText="Nessuna richiesta in attesa. Bel lavoro!"
        >
          {daApprovare.map((p) => {
            const camera = cameraById.get(p.camera_id);
            const utente = p.users
              ? [p.users.nome, p.users.cognome].filter(Boolean).join(" ") ||
                p.users.email
              : "—";
            return (
              <ListRow
                key={p.id}
                primary={
                  <span className="flex items-center gap-1.5">
                    <Hotel className="size-3.5 text-muted-foreground" />
                    {camera?.nome ?? "Camera"}
                  </span>
                }
                secondary={`${utente} · ${p.num_ospiti} ospit${p.num_ospiti === 1 ? "e" : "i"} · ${formatDate(p.data_check_in)} → ${formatDate(p.data_check_out)}`}
                trailing={formatEurFromCents(p.prezzo_totale_cents)}
                href="/dashboard/bnb"
              />
            );
          })}
        </CardList>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <header className="mb-3">
            <h4 className="text-sm font-semibold text-foreground">
              Calendario settimana
            </h4>
            <p className="text-xs text-muted-foreground">
              Arrivi previsti nei prossimi 7 giorni.
            </p>
          </header>
          <ul className="space-y-1.5">
            {Array.from(arriviPerGiorno.entries()).map(([d, n]) => (
              <li
                key={d}
                className="flex items-center justify-between rounded-xl border border-border/60 bg-background/40 px-3 py-2 text-sm"
              >
                <span className="text-foreground">{formatDate(d)}</span>
                <span
                  className={
                    n > 0
                      ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800"
                      : "text-xs text-muted-foreground"
                  }
                >
                  {n} arrivi
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </BlockShell>
  );
}
