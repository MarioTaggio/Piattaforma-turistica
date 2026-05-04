import { z } from "zod";

export const corsoSchema = z.object({
  titolo: z.string().trim().min(3).max(120),
  descrizione: z.string().trim().max(2000).optional().or(z.literal("")),
  prezzo_cents: z.coerce.number().int().min(0),
  immagine_copertina: z.string().trim().url().optional().or(z.literal("")),
  livello: z.enum(["principiante", "intermedio", "avanzato"]).optional(),
  stato: z.enum(["bozza", "pubblicato", "archiviato"]),
});

export const lezioneSchema = z.object({
  titolo: z.string().trim().min(2).max(120),
  descrizione: z.string().trim().max(500).optional().or(z.literal("")),
  video_url: z.string().trim().url("URL non valido"),
  durata_secondi: z.coerce.number().int().min(1),
  ordine: z.coerce.number().int().min(1),
  anteprima_gratuita: z.coerce.boolean().default(false),
});

export type CorsoInput = z.infer<typeof corsoSchema>;
export type LezioneInput = z.infer<typeof lezioneSchema>;
