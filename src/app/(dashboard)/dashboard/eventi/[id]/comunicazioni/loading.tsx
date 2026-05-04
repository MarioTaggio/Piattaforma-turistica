import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-6">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-3 w-full max-w-md" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-32 w-full" />
      <div className="flex justify-end">
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>
    </div>
  );
}
