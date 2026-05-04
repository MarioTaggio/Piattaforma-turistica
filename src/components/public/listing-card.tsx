import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  href: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
  imageAlt?: string;
  fallbackIcon?: LucideIcon;
  topBadge?: string;
  bottomBadge?: string;
  meta?: string;
  price?: string;
  cta?: string;
  className?: string;
};

export function ListingCard({
  href,
  title,
  description,
  imageUrl,
  imageAlt,
  fallbackIcon: FallbackIcon,
  topBadge,
  bottomBadge,
  meta,
  price,
  cta = "Scopri di più",
  className,
}: Props) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg",
        className,
      )}
    >
      <div className="relative aspect-video overflow-hidden bg-brand-50">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={imageAlt ?? title}
            className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center text-brand-700/60">
            {FallbackIcon ? <FallbackIcon className="size-10" /> : null}
          </div>
        )}
        {topBadge && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-700 shadow-sm">
            {topBadge}
          </span>
        )}
        {bottomBadge && (
          <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-brand-600 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white shadow">
            {bottomBadge}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {meta && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
            {meta}
          </p>
        )}
        <h3 className="line-clamp-2 text-base font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {description}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          {price ? (
            <span className="text-sm font-semibold text-foreground">{price}</span>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 transition group-hover:gap-1.5">
            {cta}
            <ArrowRight className="size-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
