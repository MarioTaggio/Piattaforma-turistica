import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";

export type AccentName = "blue" | "green" | "purple";

const ACCENT: Record<
  AccentName,
  {
    chip: string;
    icon: string;
    ring: string;
    title: string;
    cta: string;
    bar: string;
  }
> = {
  blue: {
    chip: "bg-blue-50 text-blue-700 ring-blue-200",
    icon: "bg-blue-100 text-blue-700",
    ring: "ring-blue-100",
    title: "text-blue-700",
    cta: "text-blue-700 hover:text-blue-800",
    bar: "bg-blue-600",
  },
  green: {
    chip: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    icon: "bg-emerald-100 text-emerald-800",
    ring: "ring-emerald-100",
    title: "text-emerald-800",
    cta: "text-emerald-800 hover:text-emerald-900",
    bar: "bg-emerald-700",
  },
  purple: {
    chip: "bg-purple-50 text-purple-700 ring-purple-200",
    icon: "bg-purple-100 text-purple-700",
    ring: "ring-purple-100",
    title: "text-purple-700",
    cta: "text-purple-700 hover:text-purple-800",
    bar: "bg-purple-600",
  },
};

export function accentClasses(name: AccentName) {
  return ACCENT[name];
}

type BlockHeaderProps = {
  emoji: string;
  title: string;
  subtitle?: string;
  accent: AccentName;
  href?: string;
  hrefLabel?: string;
};

export function BlockHeader({
  emoji,
  title,
  subtitle,
  accent,
  href,
  hrefLabel = "Vedi tutto",
}: BlockHeaderProps) {
  const a = ACCENT[accent];
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ring-1",
            a.chip,
          )}
        >
          <span aria-hidden className="text-base leading-none">
            {emoji}
          </span>
          {title}
        </span>
        {subtitle && (
          <span className="text-sm text-muted-foreground">{subtitle}</span>
        )}
      </div>
      {href && (
        <Link
          href={href}
          className={cn(
            "inline-flex items-center gap-1 text-sm font-medium",
            a.cta,
          )}
        >
          {hrefLabel}
          <ArrowUpRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}

type BlockShellProps = {
  children: ReactNode;
  accent: AccentName;
  className?: string;
};

export function BlockShell({ children, accent, className }: BlockShellProps) {
  const a = ACCENT[accent];
  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-border bg-card/40 p-5 shadow-sm",
        "ring-1",
        a.ring,
        className,
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-1", a.bar)} />
      <div className="space-y-5">{children}</div>
    </section>
  );
}

type MiniStatProps = {
  label: string;
  value: string;
  icon?: LucideIcon;
  hint?: string;
  accent?: AccentName;
};

export function MiniStat({
  label,
  value,
  icon: Icon,
  hint,
  accent = "green",
}: MiniStatProps) {
  const a = ACCENT[accent];
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              "grid size-8 shrink-0 place-items-center rounded-xl",
              a.icon,
            )}
          >
            <Icon className="size-4" />
          </span>
        )}
      </div>
      <p className="text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{children}</div>
  );
}

type CardListProps = {
  title: string;
  description?: string;
  emptyText?: string;
  href?: string;
  hrefLabel?: string;
  accent: AccentName;
  children: ReactNode;
  isEmpty?: boolean;
};

export function CardList({
  title,
  description,
  emptyText = "Nessun elemento da mostrare.",
  href,
  hrefLabel = "Apri",
  accent,
  children,
  isEmpty = false,
}: CardListProps) {
  const a = ACCENT[accent];
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <header className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className={cn(
              "inline-flex items-center gap-1 text-xs font-medium",
              a.cta,
            )}
          >
            {hrefLabel}
            <ArrowUpRight className="size-3" />
          </Link>
        )}
      </header>
      {isEmpty ? (
        <p className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </div>
  );
}

export function ListRow({
  primary,
  secondary,
  trailing,
  href,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  trailing?: ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 transition hover:bg-muted/40">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">
          {primary}
        </div>
        {secondary && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {secondary}
          </div>
        )}
      </div>
      {trailing && (
        <div className="shrink-0 text-xs text-muted-foreground">{trailing}</div>
      )}
    </div>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </li>
  );
}
