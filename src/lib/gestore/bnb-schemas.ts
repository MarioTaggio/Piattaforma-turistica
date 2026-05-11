import { z } from "zod";

export const strutturaSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  descrizione: z.string().trim().max(2000).optional().or(z.literal("")),
  indirizzo: z.string().trim().min(2).max(200),
  citta: z.string().trim().min(2).max(80),
  cap: z.string().trim().max(10).optional().or(z.literal("")),
  servizi: z.string().optional().default(""),
  immagini: z.string().optional().default(""),
  stato: z.enum(["bozza", "pubblicato", "archiviato"]),
});

export const cameraSchema = z.object({
  nome: z.string().trim().min(2).max(80),
  descrizione: z.string().trim().max(500).optional().or(z.literal("")),
  capacita: z.coerce.number().int().min(1).max(20),
  prezzo_notte_cents: z.coerce.number().int().min(0),
  disponibile: z.coerce.boolean().default(true),
});

export type StrutturaInput = z.infer<typeof strutturaSchema>;
export type CameraInput = z.infer<typeof cameraSchema>;
