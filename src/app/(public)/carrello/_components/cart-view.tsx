"use client";

import Link from "next/link";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/public/cart-context";
import { formatEurFromCents } from "@/lib/utils/format";

export function CartView() {
  const { items, count, totalCents, setQty, remove, clear } = useCart();

  // Group by shop for display.
  const byShop = new Map<string, typeof items>();
  for (const i of items) {
    const arr = byShop.get(i.shop_id) ?? [];
    arr.push(i);
    byShop.set(i.shop_id, arr);
  }

  if (count === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center">
        <ShoppingBag className="mx-auto size-10 text-muted-foreground" />
        <h2 className="mt-4 text-lg font-semibold">Il tuo carrello è vuoto</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esplora lo shop e aggiungi i prodotti che vuoi ordinare.
        </p>
        <Button
          className="mt-6 rounded-xl bg-brand-600 hover:bg-brand-700"
          render={<Link href="/shop" />}
        >
          Vai allo shop
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        {Array.from(byShop.entries()).map(([shopId, lines]) => (
          <section
            key={shopId}
            className="overflow-hidden rounded-2xl border border-border bg-card"
          >
            <header className="flex items-center justify-between border-b border-border bg-muted/40 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lines[0]?.shop_nome}
              </p>
            </header>
            <ul className="divide-y divide-border">
              {lines.map((i) => (
                <li
                  key={i.id}
                  className="flex items-center gap-3 px-5 py-3 sm:gap-4"
                >
                  {i.immagine_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={i.immagine_url}
                      alt={i.nome}
                      className="size-16 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid size-16 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
                      <ShoppingBag className="size-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{i.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatEurFromCents(i.prezzo_cents)} cad.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 rounded-xl border border-border bg-background p-0.5">
                    <button
                      type="button"
                      onClick={() => setQty(i.id, i.qty - 1)}
                      className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Diminuisci"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-6 text-center text-sm font-medium">
                      {i.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty(i.id, i.qty + 1)}
                      className="grid size-7 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Aumenta"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                  <span className="w-20 shrink-0 text-right text-sm font-semibold">
                    {formatEurFromCents(i.prezzo_cents * i.qty)}
                  </span>
                  <button
                    type="button"
                    onClick={() => remove(i.id)}
                    className="grid size-7 place-items-center rounded-lg text-destructive hover:bg-destructive/10"
                    aria-label="Rimuovi"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <button
          type="button"
          onClick={() => clear()}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Svuota carrello
        </button>
      </div>

      <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24 lg:self-start">
        <h3 className="text-base font-semibold">Riepilogo</h3>

        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Articoli</dt>
            <dd>{count}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Subtotale</dt>
            <dd>{formatEurFromCents(totalCents)}</dd>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Spedizione e IVA calcolate al checkout.
          </p>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Totale articoli</dt>
            <dd>{formatEurFromCents(totalCents)}</dd>
          </div>
        </dl>

        <Button
          size="lg"
          render={<Link href="/checkout" />}
          className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
        >
          Procedi al checkout
        </Button>
        <Button
          variant="outline"
          render={<Link href="/shop" />}
          className="w-full rounded-xl"
        >
          Continua lo shopping
        </Button>
      </aside>
    </div>
  );
}
