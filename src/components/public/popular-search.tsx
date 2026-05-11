"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search } from "lucide-react";

import { cn } from "@/lib/utils";

type Item = {
  value: string;
  label: string;
  sublabel?: string;
  count?: number;
};

type Props = {
  type: "eventi" | "bnb" | "ristoranti" | "tour";
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Titolo della sezione "popolari" (es. "Mete più richieste") */
  popularLabel?: string;
  /** className passato all'input */
  inputClassName?: string;
};

export function PopularSearch({
  type,
  value,
  onChange,
  placeholder,
  popularLabel = "Mete più richieste",
  inputClassName,
}: Props) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch popular destinations once on mount.
  useEffect(() => {
    let cancelled = false;
    void fetch(`/api/search/popular?type=${type}`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((data: { items: Item[] }) => {
        if (!cancelled) setItems(data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, [type]);

  // Click outside chiude.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const query = value.trim().toLowerCase();
  const filtered = items
    ? query
      ? items.filter(
          (i) =>
            i.label.toLowerCase().includes(query) ||
            i.sublabel?.toLowerCase().includes(query),
        )
      : items
    : [];

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={cn(inputClassName)}
        autoComplete="off"
      />

      {open && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-border bg-white text-foreground shadow-xl ring-1 ring-black/5"
        >
          {items === null ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Caricamento…
            </p>
          ) : filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              {query
                ? "Nessun risultato"
                : "Nessuna destinazione popolare al momento"}
            </p>
          ) : (
            <>
              <p className="px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {popularLabel}
              </p>
              <ul role="presentation" className="pb-2">
                {filtered.map((it) => (
                  <li key={it.value}>
                    <button
                      type="button"
                      role="option"
                      onClick={() => {
                        onChange(it.value);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted/60"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                        {type === "tour" ? (
                          <Search className="size-4" />
                        ) : (
                          <MapPin className="size-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">
                          {it.label}
                        </span>
                        {it.sublabel && (
                          <span className="block truncate text-xs text-muted-foreground">
                            {it.sublabel}
                          </span>
                        )}
                      </span>
                      {typeof it.count === "number" && it.count > 0 && (
                        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {it.count}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
