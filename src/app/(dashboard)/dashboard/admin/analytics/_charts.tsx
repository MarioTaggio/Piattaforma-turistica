"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { MonthlyPoint } from "@/lib/admin/analytics";

const BRAND = "#1B4332";

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${m}/${y!.slice(2)}`;
}

export function MonthlyLineChart({
  data,
  color = BRAND,
}: {
  data: MonthlyPoint[];
  color?: string;
}) {
  const formatted = data.map((d) => ({ ...d, label: monthLabel(d.month) }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart
        data={formatted}
        margin={{ top: 10, right: 10, bottom: 0, left: -20 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="label"
          fontSize={11}
          stroke="#94a3b8"
          tickLine={false}
        />
        <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke={color}
          strokeWidth={2}
          dot={{ fill: color, r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function RevenueBarChart({
  data,
}: {
  data: { modulo: string; revenueCents: number }[];
}) {
  const formatted = data.map((d) => ({
    modulo: d.modulo,
    revenueEur: d.revenueCents / 100,
  }));
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={formatted}
        margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="modulo"
          fontSize={11}
          stroke="#94a3b8"
          tickLine={false}
        />
        <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(v) => [`€ ${Number(v).toFixed(2)}`, "Revenue"]}
        />
        <Bar dataKey="revenueEur" fill={BRAND} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
