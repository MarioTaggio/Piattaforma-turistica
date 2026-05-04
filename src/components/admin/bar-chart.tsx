import { cn } from "@/lib/utils";

type DataPoint = {
  label: string;
  value: number;
  hint?: string;
};

type Props = {
  data: DataPoint[];
  height?: number;
  className?: string;
  emptyLabel?: string;
};

export function BarChart({
  data,
  height = 200,
  className,
  emptyLabel = "Nessun dato",
}: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const allZero = data.every((d) => d.value === 0);

  if (data.length === 0) {
    return (
      <div
        style={{ height }}
        className={cn(
          "grid place-items-center rounded-xl border border-dashed border-border bg-muted/20 text-sm text-muted-foreground",
          className,
        )}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        className="flex items-end gap-1.5 rounded-xl bg-muted/20 p-3"
        style={{ height }}
      >
        {data.map((d, i) => {
          const pct = allZero ? 0 : (d.value / max) * 100;
          return (
            <div
              key={i}
              className="group flex flex-1 flex-col items-center justify-end"
              title={`${d.label}: ${d.hint ?? d.value}`}
            >
              <div
                className="w-full rounded-t-md bg-brand-600 transition-all group-hover:bg-brand-700"
                style={{ height: `${Math.max(pct, allZero ? 0 : 2)}%` }}
              />
            </div>
          );
        })}
      </div>
      {data.length <= 14 && (
        <div className="flex gap-1.5 px-3 text-[10px] text-muted-foreground">
          {data.map((d, i) => (
            <span key={i} className="flex-1 truncate text-center">
              {d.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
