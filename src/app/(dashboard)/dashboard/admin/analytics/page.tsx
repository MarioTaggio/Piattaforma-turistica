import type { Metadata } from "next";
import {
  CalendarDays,
  Hotel,
  Landmark,
  PlayCircle,
  ShoppingBag,
  Store,
  TrendingUp,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireRole } from "@/lib/auth/dal";
import { PageHeader } from "@/components/dashboard/page-header";
import { getAnalyticsData } from "@/lib/admin/analytics";
import { formatEurFromCents, formatNumber } from "@/lib/utils/format";

import { MonthlyLineChart, RevenueBarChart } from "./_charts";

export const metadata: Metadata = {
  title: "Analytics — Piattaforma Turistica",
};

const MODULE_ICON: Record<string, LucideIcon> = {
  Eventi: CalendarDays,
  "B&B": Hotel,
  Ristoranti: UtensilsCrossed,
  Shop: Store,
  Video: PlayCircle,
  Infopoint: Landmark,
};

export default async function AdminAnalyticsPage() {
  await requireRole("admin");
  const data = await getAnalyticsData();
  const tAdmin = await getTranslations("admin");

  return (
    <div className="space-y-8">
      <PageHeader
        title={tAdmin("analyticsTitle")}
        subtitle={tAdmin("analyticsSubtitle")}
      />

      {/* Revenue cards per modulo */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Revenue per modulo
          </h2>
          <div className="text-sm">
            Totale: {" "}
            <span
              className="rounded-md px-2 py-0.5 text-base font-semibold text-white"
              style={{ background: "#1B4332" }}
            >
              {formatEurFromCents(data.totalRevenueCents)}
            </span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {data.revenue.map((r) => {
            const Icon = MODULE_ICON[r.modulo] ?? TrendingUp;
            return (
              <div
                key={r.modulo}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {r.modulo}
                    </p>
                    <p className="mt-1 truncate text-xl font-semibold">
                      {formatEurFromCents(r.revenueCents)}
                    </p>
                  </div>
                  <span
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-white"
                    style={{ background: "#1B4332" }}
                  >
                    <Icon className="size-4" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Bar chart revenue per modulo */}
      <section className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 text-sm font-semibold">
          Revenue per modulo (€)
        </h2>
        <RevenueBarChart data={data.revenue} />
      </section>

      {/* Time series */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-semibold">
            Nuove registrazioni
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Ultimi 12 mesi
          </p>
          <MonthlyLineChart data={data.registrationsByMonth} />
        </section>
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-1 text-sm font-semibold">Prenotazioni totali</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            B&amp;B + tavoli + visite + biglietti, ultimi 12 mesi
          </p>
          <MonthlyLineChart data={data.bookingsByMonth} color="#10b981" />
        </section>
      </div>

      {/* Top gestori + top contenuti */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Top 5 gestori per revenue</h2>
          {data.topGestori.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun dato disponibile.
            </p>
          ) : (
            <ol className="space-y-2">
              {data.topGestori.map((g, i) => (
                <li
                  key={g.gestoreId}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: "#1B4332" }}
                    >
                      {i + 1}
                    </span>
                    <p className="truncate text-sm font-medium">{g.nome}</p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatEurFromCents(g.revenueCents)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">
            Top 5 contenuti più venduti
          </h2>
          {data.topContenuti.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nessun dato disponibile.
            </p>
          ) : (
            <ol className="space-y-2">
              {data.topContenuti.map((c, i) => (
                <li
                  key={`${c.modulo}-${c.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 px-3 py-2"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                      style={{ background: "#1B4332" }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {c.titolo}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {c.modulo}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-semibold">
                    {formatNumber(c.count)} vendite
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
