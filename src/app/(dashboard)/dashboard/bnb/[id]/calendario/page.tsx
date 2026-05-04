import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Calendario disponibilità — Piattaforma Turistica",
};

type SearchParams = { [k: string]: string | string[] | undefined };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfMonth(year: number, month: number): Date {
  return new Date(year, month, 1);
}

function endOfMonth(year: number, month: number): Date {
  return new Date(year, month + 1, 0);
}

export default async function StrutturaCalendarioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole("gestore_bnb");
  const { id } = await params;
  const sp = await searchParams;
  const now = new Date();
  const year = parseInt((sp.year as string) ?? "", 10) || now.getFullYear();
  const month = parseInt((sp.month as string) ?? "", 10);
  const monthIdx = isNaN(month) ? now.getMonth() : month - 1;

  const supabase = await createClient();
  const { data: own } = await supabase
    .from("strutture")
    .select("gestore_id, nome")
    .eq("id", id)
    .single();
  if (!own) notFound();
  const o = own as { gestore_id: string; nome: string };
  if (o.gestore_id !== user.id && !user.roles.includes("admin")) notFound();

  // Camere della struttura
  const { data: camereRows } = await supabase
    .from("camere")
    .select("id, nome")
    .eq("struttura_id", id);
  type CameraLite = { id: string; nome: string };
  const camere = (camereRows ?? []) as CameraLite[];
  const totalCamere = camere.length;

  const monthStart = startOfMonth(year, monthIdx);
  const monthEnd = endOfMonth(year, monthIdx);

  // Carica le prenotazioni che si sovrappongono al mese corrente.
  let prenotazioni: Array<{
    camera_id: string;
    data_check_in: string;
    data_check_out: string;
    stato: string;
  }> = [];
  if (camere.length > 0) {
    const { data } = await supabase
      .from("prenotazioni_bnb")
      .select("camera_id, data_check_in, data_check_out, stato")
      .in(
        "camera_id",
        camere.map((c) => c.id),
      )
      .lte("data_check_in", ymd(monthEnd))
      .gte("data_check_out", ymd(monthStart))
      .neq("stato", "cancellata");
    prenotazioni = (data ?? []) as typeof prenotazioni;
  }

  // Calcola occupazione per giorno: per ogni data, quante camere sono prese.
  const occupazione = new Map<string, number>();
  for (const p of prenotazioni) {
    const ci = new Date(p.data_check_in);
    const co = new Date(p.data_check_out);
    for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
      const key = ymd(d);
      occupazione.set(key, (occupazione.get(key) ?? 0) + 1);
    }
  }

  // Costruisci la griglia (con offset al lunedì).
  const firstWeekday = (monthStart.getDay() + 6) % 7; // lun=0
  const totalDays = monthEnd.getDate();
  const cells: Array<{ date: Date | null; occupied?: number } | null> = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) {
    const date = new Date(year, monthIdx, d);
    const key = ymd(date);
    cells.push({ date, occupied: occupazione.get(key) ?? 0 });
  }

  const monthName = monthStart.toLocaleString("it-IT", { month: "long" });
  const prevMonth = monthIdx === 0 ? 12 : monthIdx;
  const prevYear = monthIdx === 0 ? year - 1 : year;
  const nextMonth = monthIdx === 11 ? 1 : monthIdx + 2;
  const nextYear = monthIdx === 11 ? year + 1 : year;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="capitalize">
              {monthName} {year}
            </CardTitle>
            <CardDescription>
              Giorni colorati: numero di camere occupate sul totale di{" "}
              {totalCamere}.
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`?year=${prevYear}&month=${prevMonth}`}
              className="grid size-9 place-items-center rounded-lg border border-border hover:bg-muted"
              aria-label="Mese precedente"
            >
              <ChevronLeft className="size-4" />
            </Link>
            <Link
              href={`?year=${nextYear}&month=${nextMonth}`}
              className="grid size-9 place-items-center rounded-lg border border-border hover:bg-muted"
              aria-label="Mese successivo"
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase text-muted-foreground">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {cells.map((c, i) => {
            if (!c?.date) return <div key={i} className="aspect-square" />;
            const occ = c.occupied ?? 0;
            const ratio = totalCamere > 0 ? occ / totalCamere : 0;
            const bgClass =
              ratio === 0
                ? "bg-emerald-50 text-emerald-700"
                : ratio < 0.5
                  ? "bg-amber-50 text-amber-700"
                  : ratio < 1
                    ? "bg-orange-100 text-orange-700"
                    : "bg-rose-100 text-rose-700";
            return (
              <div
                key={i}
                className={`flex aspect-square flex-col items-center justify-center rounded-lg border border-border text-sm ${bgClass}`}
              >
                <span className="font-semibold">{c.date.getDate()}</span>
                {totalCamere > 0 && (
                  <span className="text-[10px] opacity-80">
                    {occ}/{totalCamere}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <Legend className="bg-emerald-50" label="Libero" />
          <Legend className="bg-amber-50" label="< 50%" />
          <Legend className="bg-orange-100" label="< 100%" />
          <Legend className="bg-rose-100" label="Tutto pieno" />
        </div>
      </CardContent>
    </Card>
  );
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-3 rounded ${className}`} />
      {label}
    </span>
  );
}
