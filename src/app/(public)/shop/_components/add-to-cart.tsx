"use client";

import { useState } from "react";
import { Check, Plus, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/public/cart-context";

type Props = {
  product: {
    id: string;
    nome: string;
    prezzo_cents: number;
    immagine_url: string | null;
    shop_id: string;
    shop_nome: string;
  };
  variant?: "card" | "full";
};

export function AddToCartButton({ product, variant = "card" }: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    add(product, 1);
    toast.success(`${product.nome} aggiunto al carrello`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  }

  if (variant === "full") {
    return (
      <Button
        type="button"
        size="lg"
        onClick={onClick}
        className="rounded-xl bg-brand-600 hover:bg-brand-700"
      >
        {added ? (
          <Check className="mr-1.5 size-4" />
        ) : (
          <ShoppingCart className="mr-1.5 size-4" />
        )}
        {added ? "Aggiunto" : "Aggiungi al carrello"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Aggiungi al carrello"
      className="grid size-9 place-items-center rounded-xl bg-brand-600 text-white transition hover:bg-brand-700"
    >
      {added ? <Check className="size-4" /> : <Plus className="size-4" />}
    </button>
  );
}
