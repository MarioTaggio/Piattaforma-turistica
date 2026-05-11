import Link from "next/link";

import { cn } from "@/lib/utils";

type Props = {
  basePath: string;
  active: string;
  counts?: Partial<Record<"in_attesa" | "approvata" | "rifiutata", number>>;
};

const FILTERS = [
  { value: "tutte", label: "Tutte" },
  { value: "in_attesa", label: "In attesa" },
  { value: "approvata", label: "Approvate" },
  { value: "rifiutata", label: "Rifiutate" },
] as const;

export function RecensioniFilterTabs({ basePath, active, counts }: Props) {
  return (
    <nav className="inline-flex rounded-xl bg-muted/40 p-1 text-sm">
      {FILTERS.map((f) => {
        const isActive = active === f.value;
        const c =
          f.value === "tutte"
            ? undefined
            : counts?.[f.value as "in_attesa" | "approvata" | "rifiutata"];
        return (
          <Link
            key={f.value}
            href={f.value === "tutte" ? basePath : `${basePath}?stato=${f.value}`}
            className={cn(
              "rounded-lg px-3 py-1.5 font-medium transition",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {f.label}
            {typeof c === "number" && c > 0 && (
              <span className="ml-1.5 inline-flex items-center rounded-full bg-brand-100 px-1.5 text-[10px] font-bold text-brand-700">
                {c}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
