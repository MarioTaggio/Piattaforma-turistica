"use client";

import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";

import { cn } from "@/lib/utils";

import { useCart } from "./cart-context";

export function CartLink() {
  const { count, open, bounceTick } = useCart();
  const [bouncing, setBouncing] = useState(false);

  useEffect(() => {
    if (bounceTick === 0) return;
    setBouncing(true);
    const t = setTimeout(() => setBouncing(false), 500);
    return () => clearTimeout(t);
  }, [bounceTick]);

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Carrello"
      className={cn(
        "relative grid size-9 place-items-center rounded-lg text-foreground/80 hover:bg-muted",
        bouncing && "animate-bounce",
      )}
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-4 text-white">
          {count}
        </span>
      )}
    </button>
  );
}
