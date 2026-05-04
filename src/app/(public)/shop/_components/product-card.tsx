import Link from "next/link";
import { Store } from "lucide-react";

import { formatEurFromCents } from "@/lib/utils/format";

import { AddToCartButton } from "./add-to-cart";

type Props = {
  product: {
    id: string;
    nome: string;
    descrizione: string | null;
    prezzo_cents: number;
    categoria: string | null;
    immagine_url: string | null;
    shop_id: string;
    shop_nome: string;
  };
};

export function ProductCard({ product }: Props) {
  return (
    <Link
      href={`/shop/${product.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-video overflow-hidden bg-brand-50">
        {product.immagine_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.immagine_url}
            alt={product.nome}
            className="size-full object-cover transition duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="grid size-full place-items-center text-brand-700/60">
            <Store className="size-10" />
          </div>
        )}
        {product.categoria && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-brand-700 shadow-sm">
            {product.categoria}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
          {product.shop_nome}
        </p>
        <h3 className="line-clamp-2 text-base font-semibold tracking-tight">
          {product.nome}
        </h3>
        {product.descrizione && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {product.descrizione}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between pt-2">
          <span className="text-base font-semibold text-foreground">
            {formatEurFromCents(product.prezzo_cents)}
          </span>
          <AddToCartButton product={product} />
        </div>
      </div>
    </Link>
  );
}
