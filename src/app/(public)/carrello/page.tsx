import type { Metadata } from "next";

import { PageHero } from "@/components/public/page-hero";

import { CartView } from "./_components/cart-view";

export const metadata: Metadata = {
  title: "Carrello — Piattaforma Turistica",
};

export default function CarrelloPage() {
  return (
    <>
      <PageHero
        eyebrow="Carrello"
        title="Conferma il tuo ordine"
        subtitle="Verifica i prodotti, scegli la modalità e completa l'ordine."
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CartView />
      </div>
    </>
  );
}
