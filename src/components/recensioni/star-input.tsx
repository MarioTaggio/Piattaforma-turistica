"use client";

import { Star } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type Props = {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function StarInput({ value, onChange, size = "lg", className }: Props) {
  const [hover, setHover] = useState(0);
  const sizeClass =
    size === "sm" ? "size-4" : size === "lg" ? "size-7" : "size-5";
  const display = hover || value;

  return (
    <div
      className={cn("inline-flex items-center gap-1", className)}
      role="radiogroup"
      aria-label="Voto"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          className="rounded p-0.5 transition hover:scale-110"
        >
          <Star
            className={cn(
              sizeClass,
              n <= display
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-muted-foreground/40",
            )}
          />
        </button>
      ))}
    </div>
  );
}
