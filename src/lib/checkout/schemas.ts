import { z } from "zod";

const indirizzoBase = {
  nome: z.string().trim().min(2, "Nome richiesto").max(60),
  cognome: z.string().trim().min(2, "Cognome richiesto").max(60),
  indirizzo: z.string().trim().min(3, "Indirizzo richiesto").max(200),
  citta: z.string().trim().min(2, "Città richiesta").max(80),
  cap: z
    .string()
    .trim()
    .regex(/^\d{5}$/u, "CAP non valido (5 cifre)"),
  provincia: z
    .string()
    .trim()
    .length(2, "Provincia: 2 lettere (es. RM)")
    .toUpperCase(),
};

export const shippingSchema = z.object({
  ...indirizzoBase,
  telefono: z
    .string()
    .trim()
    .regex(/^[+\d\s-]{6,20}$/u, "Telefono non valido"),
  email: z.string().email("Email non valida"),
});

export const billingSchema = z.discriminatedUnion("uguale", [
  z.object({ uguale: z.literal(true) }),
  z.object({
    uguale: z.literal(false),
    ...indirizzoBase,
    partita_iva: z
      .string()
      .trim()
      .regex(/^$|^\d{11}$/u, "P.IVA: 11 cifre")
      .optional(),
    codice_fiscale: z
      .string()
      .trim()
      .max(16)
      .optional(),
  }),
]);

export const checkoutSchema = z.object({
  shipping: shippingSchema,
  billing: billingSchema,
  metodo_spedizione: z.enum(["standard", "express", "ritiro"]),
  metodo_pagamento: z.enum(["online", "alla_consegna"]),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export type ShippingInput = z.infer<typeof shippingSchema>;
export type BillingInput = z.infer<typeof billingSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const PAYMENT_LABEL: Record<"online" | "alla_consegna", string> = {
  online: "Pagamento online",
  alla_consegna: "Pagamento alla consegna",
};

export const SHIPPING_COSTS_CENTS: Record<
  "standard" | "express" | "ritiro",
  number
> = {
  standard: 590,
  express: 1290,
  ritiro: 0,
};

export const SHIPPING_LABEL: Record<
  "standard" | "express" | "ritiro",
  string
> = {
  standard: "Spedizione standard (3-5 gg)",
  express: "Spedizione express (1-2 gg)",
  ritiro: "Ritiro in punto vendita",
};

export const SHIPPING_ETA_DAYS: Record<
  "standard" | "express" | "ritiro",
  string
> = {
  standard: "3-5 giorni lavorativi",
  express: "1-2 giorni lavorativi",
  ritiro: "Disponibile entro 24h",
};

// 22% IVA inclusa nel prezzo (default Italia). Calcolata come scorporo.
export const IVA_RATE = 0.22;

export function computeTotals(opts: {
  subtotalCents: number;
  metodo: "standard" | "express" | "ritiro";
}): {
  subtotalCents: number;
  shippingCents: number;
  ivaCents: number;
  totalCents: number;
} {
  const shippingCents = SHIPPING_COSTS_CENTS[opts.metodo];
  const total = opts.subtotalCents + shippingCents;
  // IVA scorporata dal totale (prezzi già IVA inclusa).
  const ivaCents = Math.round(total - total / (1 + IVA_RATE));
  return {
    subtotalCents: opts.subtotalCents,
    shippingCents,
    ivaCents,
    totalCents: total,
  };
}
