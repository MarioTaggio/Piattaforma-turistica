import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, ChevronLeft, ChevronRight, Users } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatusBadge } from "@/components/dashboard/status-badge";

export const metadata: Metadata = {
  title: "Agenda prenotazioni — Piattaforma Turistica",
};

type SearchParams = { [k: string]: string | string[] | undefined };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Pren = {
  id: string;
  data_ora: string;
  num_ospiti: number;
  stato: string;
  note: string | null;
  tavoli: { numero: string } | null;
  users: { nome: string | null; cognome: string | null; email: string } | null;
};

export default async function RistoranteAgendaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole("gestore_ristorante");
  const { id } = await params;
  const sp = await searchParams;
  const dateParam = (sp.date as string | undefined) ?? ymd(new Date());
  const date = new Date(dateParam + "T00:00:00");

  const supabase = await createClient();

  const { data: own } = await supabase
    .from("ristoranti")
    .select("gestore_id")
    .eq("id", id)
    .single();
  if (!own) notFound();
  if (
    (own as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const { data } = await supabase
    .from("prenotazioni_tavolo")
    .select(
      `id, data_ora, num_ospiti, stato, note,
       tavoli!inner ( numero, ristorante_id ),
       users ( nome, cognome, email )`,
    )
    .eq("tavoli.ristorante_id", id)
    .gte("data_ora", dayStart.toISOString())
    .lte("data_ora", dayEnd.toISOString())
    .order("data_ora", { ascending: true });

  const prenotazioni = ((data ?? []) as unknown) as Pren[];

  // Group by HH:00 slot
  const slots = new Map<string, Pren[]>();
  for (const p of prenotazioni) {
    const d = new Date(p.data_ora);
    const slot = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    const arr = slots.get(slot) ?? [];
    arr.push(p);
    slots.set(slot, arr);
  }

  const prevDay = new Date(date);
  prevDay.setDate(prevDay.getDate() - 1);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const totalCoperti = prenotazioni.reduce(
    (s, p) => s + (p.num_ospiti ?? 0),
    0,
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="capitalize">
              {date.toLocaleDateString("it-IT", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </CardTitle>
            <CardDescription>
              {prenotazioni.length} prenotazion
              {prenotazioni.length === 1 ? "e" : "i"} · {totalCoperti} copert
              {totalCoperti === 1 ? "o" : "i"}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`?date=${ymd(prevDay)}`}
              className="grid size-9 place-items-center rounded-lg border border-border hover:bg-muted"
              aria-label="Giorno precedente"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={`?date=${ymd(new Date())}`}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted"
            >
              Oggi
            </Link>
            <Link
              href={`?date=${ymd(nextDay)}`}
              className="grid size-9 place-items-center rounded-lg border border-border hover:bg-muted"
              aria-label="Giorno successivo"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {prenotazioni.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm text-muted-foreground">
            <CalendarClock className="size-8 text-muted-foreground/60" />
            Nessuna prenotazione per questa data.
          </div>
        ) : (
          <ol className="space-y-3">
            {Array.from(slots.entries()).map(([slot, list]) => (
              <li
                key={slot}
                className="flex gap-4 rounded-2xl border border-border bg-card p-4"
              >
                <div className="w-16 shrink-0 text-center">
                  <p className="text-xl font-semibold">{slot}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {list.reduce((s, p) => s + p.num_ospiti, 0)} coperti
                  </p>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {list.map((p) => {
                    const fullName = [p.users?.nome, p.users?.cognome]
                      .filter(Boolean)
                      .join(" ");
                    return (
                      <div
                        key={p.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">
                          {fullName || p.users?.email || "—"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="size-3" />
                          {p.num_ospiti}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Tavolo {p.tavoli?.numero ?? "?"}
                        </span>
                        {p.note && (
                          <span className="text-xs italic text-muted-foreground">
                            “{p.note}”
                          </span>
                        )}
                        <div className="ml-auto">
                          <StatusBadge kind="prenotazione" value={p.stato} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
