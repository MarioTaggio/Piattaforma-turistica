"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatEurFromCents } from "@/lib/utils/format";

import { useCart } from "./cart-context";

const FREE_SHIPPING_THRESHOLD_CENTS = 5000;

export function CartDrawer() {
  const { isOpen, close, items, totalCents, setQty, remove } = useCart();

  // Lock body scroll while open.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const missingForFreeShipping = FREE_SHIPPING_THRESHOLD_CENTS - totalCents;

  return (
    <div
      aria-hidden={!isOpen}
      className={`fixed inset-0 z-50 ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
    >
      <div
        onClick={close}
        className={`absolute inset-0 bg-foreground/40 backdrop-blur-sm transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-brand-700" />
            <h2 className="text-base font-semibold">Carrello</h2>
            {items.length > 0 && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                {items.reduce((s, i) => s + i.qty, 0)}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Chiudi"
            className="grid size-8 place-items-center rounded-lg hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </header>

        {items.length > 0 && missingForFreeShipping > 0 && (
          <div className="border-b border-border bg-amber-50 px-5 py-3 text-xs text-amber-900">
            Aggiungi{" "}
            <strong>{formatEurFromCents(missingForFreeShipping)}</strong> per la
            spedizione gratuita.
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center text-center text-sm text-muted-foreground">
              <div>
                <ShoppingCart className="mx-auto size-10 text-muted-foreground/40" />
                <p className="mt-3">Il tuo carrello è vuoto.</p>
              </div>
            </div>
          ) : (
            <ul className="space-y-3">
              {items.map((it) => (
                <li
                  key={it.id}
                  className="flex gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {it.immagine_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={it.immagine_url}
                        alt={it.nome}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{it.nome}</p>
                    <p className="text-xs text-muted-foreground">{it.shop_nome}</p>
                    <p className="mt-1 text-sm font-semibold">
                      {formatEurFromCents(it.prezzo_cents * it.qty)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end justify-between">
                    <button
                      type="button"
                      onClick={() => remove(it.id)}
                      aria-label="Rimuovi"
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <div className="flex items-center gap-1 rounded-lg border border-border">
                      <button
                        type="button"
                        onClick={() => setQty(it.id, it.qty - 1)}
                        aria-label="-"
                        className="grid size-7 place-items-center hover:bg-muted"
                      >
                        <Minus className="size-3" />
                      </button>
                      <span className="min-w-5 text-center text-xs font-semibold">
                        {it.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQty(it.id, it.qty + 1)}
                        aria-label="+"
                        className="grid size-7 place-items-center hover:bg-muted"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {items.length > 0 && (
          <footer className="space-y-3 border-t border-border px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotale</span>
              <span className="text-base font-semibold">
                {formatEurFromCents(totalCents)}
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                render={<Link href="/carrello" onClick={close} />}
              >
                Visualizza carrello
              </Button>
              <Button
                className="flex-1 rounded-xl bg-brand-600 hover:bg-brand-700"
                render={<Link href="/checkout" onClick={close} />}
              >
                Pagamento
              </Button>
            </div>
          </footer>
        )}
      </aside>
    </div>
  );
}
