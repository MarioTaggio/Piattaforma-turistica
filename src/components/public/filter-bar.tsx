"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

export type FilterField =
  | { type: "search"; param: string; placeholder: string }
  | { type: "select"; param: string; placeholder: string; options: { value: string; label: string }[] }
  | { type: "number"; param: string; placeholder: string; min?: number; max?: number }
  | { type: "date"; param: string; placeholder: string };

type Props = {
  fields: FilterField[];
};

export function FilterBar({ fields }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state mirroring URL params for debounced UX.
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) init[f.param] = searchParams.get(f.param) ?? "";
    return init;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function pushValues(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const f of fields) {
      const v = (next[f.param] ?? "").trim();
      if (v) params.set(f.param, v);
      else params.delete(f.param);
    }
    params.delete("page");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => pushValues(values), 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  const hasActive = Object.values(values).some((v) => v.trim().length > 0);

  function setVal(param: string, v: string) {
    setValues((prev) => ({ ...prev, [param]: v }));
  }

  function clearAll() {
    const cleared: Record<string, string> = {};
    for (const f of fields) cleared[f.param] = "";
    setValues(cleared);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:flex-row sm:items-center">
      <div className="hidden items-center gap-2 px-2 text-muted-foreground sm:flex">
        <SlidersHorizontal className="size-4" />
        <span className="text-xs font-medium uppercase tracking-wider">Filtri</span>
      </div>
      <div className="grid flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => {
          if (f.type === "search") {
            return (
              <div key={f.param} className="relative lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={values[f.param] ?? ""}
                  onChange={(e) => setVal(f.param, e.target.value)}
                  placeholder={f.placeholder}
                  className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            );
          }
          if (f.type === "select") {
            return (
              <select
                key={f.param}
                value={values[f.param] ?? ""}
                onChange={(e) => setVal(f.param, e.target.value)}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">{f.placeholder}</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            );
          }
          if (f.type === "number") {
            return (
              <input
                key={f.param}
                type="number"
                min={f.min}
                max={f.max}
                value={values[f.param] ?? ""}
                onChange={(e) => setVal(f.param, e.target.value)}
                placeholder={f.placeholder}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            );
          }
          return (
            <input
              key={f.param}
              type="date"
              value={values[f.param] ?? ""}
              onChange={(e) => setVal(f.param, e.target.value)}
              aria-label={f.placeholder}
              className="h-10 rounded-lg border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          );
        })}
      </div>
      {hasActive && (
        <button
          type="button"
          onClick={clearAll}
          className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" />
          Reset
        </button>
      )}
    </div>
  );
}
