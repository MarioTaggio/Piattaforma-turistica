import type { LucideIcon } from "lucide-react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

import { cn } from "@/lib/utils";

type Trend = {
  value: number; // percentage
  label?: string; // e.g. "vs mese scorso"
};

type Props = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: Trend;
  hint?: string;
  variant?: "neutral" | "primary";
  className?: string;
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  hint,
  variant = "neutral",
  className,
}: Props) {
  const isPrimary = variant === "primary";
  const trendUp = trend && trend.value >= 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-2xl p-5 shadow-sm",
        isPrimary
          ? "bg-brand-600 text-white"
          : "border border-border bg-card text-card-foreground",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p
          className={cn(
            "text-sm font-medium",
            isPrimary ? "text-white/80" : "text-muted-foreground",
          )}
        >
          {label}
        </p>
        {Icon && (
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-xl",
              isPrimary ? "bg-white/15 text-white" : "bg-brand-50 text-brand-700",
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
      </div>

      <div className="flex items-center justify-between">
        {trend ? (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              isPrimary
                ? "bg-white/15 text-white"
                : trendUp
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-rose-50 text-rose-700",
            )}
          >
            {trendUp ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {trendUp ? "+" : ""}
            {trend.value}%
            {trend.label && (
              <span
                className={cn(
                  "font-normal",
                  isPrimary ? "text-white/80" : "text-muted-foreground",
                )}
              >
                {" "}{trend.label}
              </span>
            )}
          </div>
        ) : (
          <span />
        )}
        {hint && (
          <span
            className={cn(
              "text-xs",
              isPrimary ? "text-white/70" : "text-muted-foreground",
            )}
          >
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}
