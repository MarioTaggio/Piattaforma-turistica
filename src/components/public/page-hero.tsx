import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  variant?: "light" | "dark";
  className?: string;
};

export function PageHero({
  eyebrow,
  title,
  subtitle,
  actions,
  variant = "light",
  className,
}: Props) {
  const dark = variant === "dark";
  return (
    <section
      className={cn(
        dark
          ? "bg-brand-600 text-white"
          : "bg-gradient-to-b from-brand-50/60 to-background",
        className,
      )}
    >
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="flex flex-col items-start gap-4">
          {eyebrow && (
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider",
                dark
                  ? "bg-white/15 text-white"
                  : "bg-brand-50 text-brand-700",
              )}
            >
              {eyebrow}
            </span>
          )}
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          {subtitle && (
            <p
              className={cn(
                "max-w-2xl text-base sm:text-lg",
                dark ? "text-white/85" : "text-muted-foreground",
              )}
            >
              {subtitle}
            </p>
          )}
          {actions && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
