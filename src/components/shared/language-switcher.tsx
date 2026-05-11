"use client";

import { useState, useTransition } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLocale } from "next-intl";

import { setLocale } from "@/i18n/actions";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

type Props = {
  /**
   * "compact" → solo bandierina (per dashboard header).
   * "full" → bandierina + nome lingua (per navbar pubblico).
   */
  variant?: "compact" | "full";
  align?: "left" | "right";
};

export function LanguageSwitcher({
  variant = "full",
  align = "right",
}: Props) {
  const current = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const onPick = (next: Locale) => {
    setOpen(false);
    if (next === current) return;
    startTransition(async () => {
      await setLocale(next);
    });
  };

  const currentLabel = LOCALE_LABELS[current] ?? LOCALE_LABELS.it;

  return (
    <div className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-xl border border-border bg-background px-2.5 py-1.5 text-sm font-medium transition hover:bg-muted disabled:opacity-60",
          variant === "compact" && "px-2",
        )}
      >
        {variant === "compact" ? (
          <span aria-hidden className="text-base leading-none">
            {currentLabel.flag}
          </span>
        ) : (
          <>
            <Globe className="size-3.5 text-muted-foreground" />
            <span aria-hidden className="text-base leading-none">
              {currentLabel.flag}
            </span>
            <span className="hidden sm:inline">{currentLabel.name}</span>
          </>
        )}
        <ChevronDown className="size-3.5 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <ul
            role="listbox"
            className={cn(
              "absolute z-50 mt-1.5 min-w-[160px] overflow-hidden rounded-xl border border-border bg-card p-1 shadow-lg",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {LOCALES.map((loc) => {
              const isActive = loc === current;
              const meta = LOCALE_LABELS[loc];
              return (
                <li key={loc}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => onPick(loc)}
                    disabled={pending}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-muted disabled:opacity-60",
                      isActive && "bg-muted font-medium",
                    )}
                  >
                    <span aria-hidden className="text-base leading-none">
                      {meta.flag}
                    </span>
                    <span className="flex-1">{meta.name}</span>
                    {isActive && (
                      <Check className="size-3.5 text-brand-600" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
