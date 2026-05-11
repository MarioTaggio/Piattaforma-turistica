import { z } from "zod";

export const shopSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  descrizione: z.string().trim().max(2000).optional().or(z.literal("")),
  citta: z.string().trim().max(80).optional().or(z.literal("")),
  indirizzo: z.string().trim().max(200).optional().or(z.literal("")),
  telefono: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  immagini: z.array(z.string().url()).max(10).optional().default([]),
  stato: z.enum(["bozza", "pubblicato", "archiviato"]),
});

export const shopProdottoSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  descrizione: z.string().trim().max(500).optional().or(z.literal("")),
  prezzo_cents: z.coerce.number().int().min(0),
  categoria: z.string().trim().max(80).optional().or(z.literal("")),
  immagine_url: z.string().trim().url().optional().or(z.literal("")),
  disponibile: z.coerce.boolean().default(true),
});

export type ShopInput = z.infer<typeof shopSchema>;
export type ShopProdottoInput = z.infer<typeof shopProdottoSchema>;
