import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/dal";
import { PageHero } from "@/components/public/page-hero";

import { CheckoutClient } from "./_components/checkout-client";

export const metadata: Metadata = {
  title: "Checkout — Piattaforma Turistica",
};

export default async function CheckoutPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/checkout");

  return (
    <>
      <PageHero
        eyebrow="Checkout"
        title="Completa il tuo ordine"
        subtitle="Inserisci i dati di consegna e fatturazione, scegli la spedizione e paga in sicurezza con Stripe."
      />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <CheckoutClient
          defaultEmail={user.email}
          defaultNome={user.nome ?? ""}
          defaultCognome={user.cognome ?? ""}
        />
      </div>
    </>
  );
}
