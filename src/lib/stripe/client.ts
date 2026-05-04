"use client";

import { loadStripe, type Stripe } from "@stripe/stripe-js";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      // Lazy fail in browser console — keeps server build OK.
      console.warn(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY non configurata: i pagamenti non funzioneranno.",
      );
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}
