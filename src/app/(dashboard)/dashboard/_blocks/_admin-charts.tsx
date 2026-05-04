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

const BRAND = "#1B4332";

export type ModuloRevenuePoint = {
  month: string; // "01/26"
  eventi: number;
  bnb: number;
  ristoranti: number;
  shop: number;
  video: number;
  visite: number;
};

export type DailyRevenuePoint = {
  day: string; // "23/04"
  revenue: number;
};

export function RevenuePerModuloChart({
  data,
}: {
  data: ModuloRevenuePoint[];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="month" fontSize={11} stroke="#94a3b8" tickLine={false} />
        <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(v) => [`€ ${Number(v).toFixed(0)}`, ""]}
        />
        <Bar dataKey="eventi" stackId="a" fill="#1B4332" radius={[0, 0, 0, 0]} />
        <Bar dataKey="bnb" stackId="a" fill="#2D6A4F" />
        <Bar dataKey="ristoranti" stackId="a" fill="#40916C" />
        <Bar dataKey="shop" stackId="a" fill="#52B788" />
        <Bar dataKey="video" stackId="a" fill="#74C69D" />
        <Bar dataKey="visite" stackId="a" fill="#95D5B2" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyRevenueChart({ data }: { data: DailyRevenuePoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="day" fontSize={11} stroke="#94a3b8" tickLine={false} />
        <YAxis fontSize={11} stroke="#94a3b8" tickLine={false} />
        <Tooltip
          contentStyle={{
            background: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          formatter={(v) => [`€ ${Number(v).toFixed(0)}`, "Revenue"]}
        />
        <Line
          type="monotone"
          dataKey="revenue"
          stroke={BRAND}
          strokeWidth={2}
          dot={{ fill: BRAND, r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
