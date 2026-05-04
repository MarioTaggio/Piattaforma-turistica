import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function SectionCard({
  title,
  subtitle,
  actions,
  children,
  className,
  bodyClassName,
}: Props) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="space-y-0.5">
            {title && <h2 className="text-base font-semibold">{title}</h2>}
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          )}
        </header>
      )}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
