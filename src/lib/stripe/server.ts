import "server-only";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  // Don't throw at import time — env may be absent in some commands.
  // Throw lazily when actually used.
}

export const stripe = new Stripe(key ?? "", {
  // Pin a stable API version explicitly.
  apiVersion: "2026-04-22.dahlia",
  typescript: true,
});

export function assertStripeConfigured(): void {
  if (!key)
    throw new Error(
      "STRIPE_SECRET_KEY non configurata in .env.local — impossibile creare PaymentIntent.",
    );
}
