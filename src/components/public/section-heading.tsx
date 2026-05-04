import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  ctaHref,
  ctaLabel = "Vedi tutti",
}: Props) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow && (
          <span className="inline-flex items-center rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            {eyebrow}
          </span>
        )}
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="max-w-2xl text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {ctaHref && (
        <Link
          href={ctaHref}
          className="inline-flex shrink-0 items-center gap-1 self-start rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium text-brand-700 shadow-sm transition hover:bg-brand-50 sm:self-end"
        >
          {ctaLabel}
          <ArrowRight className="size-3.5" />
        </Link>
      )}
    </div>
  );
}
