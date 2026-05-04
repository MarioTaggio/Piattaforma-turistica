"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
};

export function Pagination({ page, totalPages }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  if (totalPages <= 1) return null;

  function go(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete("page");
    else params.set("page", String(p));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);

  // Show window of up to 5 page numbers around current.
  const windowSize = 5;
  const start = Math.max(1, Math.min(page - 2, totalPages - windowSize + 1));
  const end = Math.min(totalPages, start + windowSize - 1);
  const pages: number[] = [];
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-2.5 text-sm">
      <span className="text-xs text-muted-foreground">
        Pagina {page} di {totalPages}
      </span>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => go(prev)}
          disabled={page === 1}
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronLeft className="size-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            className={cn(
              "grid h-7 min-w-7 place-items-center rounded-md px-2 text-xs font-medium transition",
              p === page
                ? "bg-brand-600 text-white"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          onClick={() => go(next)}
          disabled={page === totalPages}
          className="grid size-7 place-items-center rounded-md text-muted-foreground transition hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
