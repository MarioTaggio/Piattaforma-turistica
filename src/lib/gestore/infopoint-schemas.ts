import { z } from "zod";

export const attrazioneSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  descrizione: z.string().trim().max(2000).optional().or(z.literal("")),
  indirizzo: z.string().trim().min(2).max(200),
  citta: z.string().trim().min(2).max(80),
  categoria: z.string().trim().max(80).optional().or(z.literal("")),
  orari: z.string().trim().max(500).optional().or(z.literal("")),
  immagini: z.array(z.string().url()).max(10).optional().default([]),
  tour_url: z.string().trim().url().optional().or(z.literal("")),
  tour_gratuito: z.coerce.boolean().default(true),
  stato: z.enum(["bozza", "pubblicato", "archiviato"]),
});

export const visitaSchema = z
  .object({
    titolo: z.string().trim().min(3).max(120),
    descrizione: z.string().trim().max(500).optional().or(z.literal("")),
    data_ora: z.string().min(1, "Obbligatoria"),
    durata_minuti: z.coerce.number().int().min(15),
    posti_totali: z.coerce.number().int().min(1),
    prezzo_cents: z.coerce.number().int().min(0),
    lingua: z.string().trim().min(2).max(10).default("it"),
    stato: z.enum(["bozza", "pubblicato", "archiviato"]),
  })
  .refine((d) => d.posti_totali >= 1, { message: "Posti non validi" });

export type AttrazioneInput = z.infer<typeof attrazioneSchema>;
export type VisitaInput = z.infer<typeof visitaSchema>;
