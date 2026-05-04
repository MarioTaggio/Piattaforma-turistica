import { z } from "zod";

export const ristoranteSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  descrizione: z.string().trim().max(2000).optional().or(z.literal("")),
  indirizzo: z.string().trim().min(2).max(200),
  citta: z.string().trim().min(2).max(80),
  telefono: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  tipo_cucina: z.string().trim().max(80).optional().or(z.literal("")),
  orari: z.string().trim().max(500).optional().or(z.literal("")),
  immagini: z.string().optional().default(""),
  stato: z.enum(["bozza", "pubblicato", "archiviato"]),
});

export const tavoloSchema = z.object({
  numero: z.string().trim().min(1).max(20),
  posti: z.coerce.number().int().min(1).max(50),
  posizione: z.string().trim().max(40).optional().or(z.literal("")),
  attivo: z.coerce.boolean().default(true),
});

export const prodottoSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  descrizione: z.string().trim().max(500).optional().or(z.literal("")),
  prezzo_cents: z.coerce.number().int().min(0),
  categoria: z.string().trim().max(80).optional().or(z.literal("")),
  immagine_url: z.string().trim().url().optional().or(z.literal("")),
});

export type RistoranteInput = z.infer<typeof ristoranteSchema>;
export type TavoloInput = z.infer<typeof tavoloSchema>;
export type ProdottoInput = z.infer<typeof prodottoSchema>;
