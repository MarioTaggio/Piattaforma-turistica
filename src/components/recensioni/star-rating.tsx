import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  value: number; // 0..5 (può essere decimale)
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function StarRating({ value, size = "md", className }: Props) {
  const filled = Math.round(value);
  const sizeClass =
    size === "sm" ? "size-3.5" : size === "lg" ? "size-5" : "size-4";
  return (
    <span
      className={cn("inline-flex items-center gap-0.5", className)}
      aria-label={`${value} su 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            sizeClass,
            n <= filled
              ? "fill-amber-400 text-amber-400"
              : "fill-transparent text-muted-foreground/40",
          )}
        />
      ))}
    </span>
  );
}
