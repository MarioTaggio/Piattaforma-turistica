"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";

import { useCart } from "./cart-context";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link
      href="/carrello"
      aria-label="Carrello"
      className="relative grid size-9 place-items-center rounded-lg text-foreground/80 hover:bg-muted"
    >
      <ShoppingCart className="size-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold leading-4 text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
