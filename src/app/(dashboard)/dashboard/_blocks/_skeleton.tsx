import { Skeleton } from "@/components/ui/skeleton";

import { BlockShell, type AccentName } from "./_section";

export function BlockSkeleton({
  accent,
  rows = 1,
}: {
  accent: AccentName;
  rows?: number;
}) {
  return (
    <BlockShell accent={accent}>
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-48 rounded-full" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-2xl" />
      ))}
    </BlockShell>
  );
}
