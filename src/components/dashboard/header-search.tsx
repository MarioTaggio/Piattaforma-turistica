"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Loader2, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { globalSearch, type SearchGroup } from "@/lib/search/global";

export function HeaderSearch() {
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce 300ms
  useEffect(() => {
    const v = value.trim();
    if (v.length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const groups = await globalSearch(v);
        setResults(groups);
        setOpen(true);
      });
    }, 300);
    return () => clearTimeout(handle);
  }, [value]);

  // Click-outside chiude il dropdown
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ESC chiude
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const totalHits = results.reduce((s, g) => s + g.hits.length, 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Cerca eventi, strutture, ristoranti, prodotti…"
        className="h-10 rounded-full border-transparent bg-muted pl-9 pr-9 focus-visible:bg-background"
      />
      {pending ? (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : value ? (
        <button
          type="button"
          onClick={() => {
            setValue("");
            setResults([]);
            setOpen(false);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-muted-foreground/10 hover:text-foreground"
          aria-label="Cancella ricerca"
        >
          <X className="size-3.5" />
        </button>
      ) : null}

      {open && value.trim().length >= 2 && (
        <div
          role="listbox"
          className="absolute left-0 right-0 top-12 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-border bg-card shadow-xl"
        >
          {totalHits === 0 && !pending ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Nessun risultato per &laquo;{value}&raquo;
            </div>
          ) : (
            <ul className="py-1">
              {results.map((g) => (
                <li key={g.category}>
                  <h4 className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {g.category}
                  </h4>
                  <ul>
                    {g.hits.map((h) => (
                      <li key={`${g.category}-${h.id}`}>
                        <Link
                          href={h.href}
                          onClick={() => {
                            setOpen(false);
                            setValue("");
                          }}
                          className="block px-4 py-2 transition hover:bg-muted/50"
                        >
                          <p className="truncate text-sm font-medium">
                            {h.title}
                          </p>
                          {h.subtitle && (
                            <p className="truncate text-xs text-muted-foreground">
                              {h.subtitle}
                            </p>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
