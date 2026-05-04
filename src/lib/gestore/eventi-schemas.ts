import { z } from "zod";

export const eventoSchema = z
  .object({
    titolo: z.string().trim().min(3, "Almeno 3 caratteri").max(120),
    descrizione: z.string().trim().max(2000).optional().or(z.literal("")),
    luogo: z.string().trim().min(2, "Inserisci il luogo").max(120),
    citta: z.string().trim().max(80).optional().or(z.literal("")),
    data_inizio: z.string().min(1, "Obbligatoria"),
    data_fine: z.string().min(1, "Obbligatoria"),
    prezzo_cents: z.coerce.number().int().min(0, "Non negativo"),
    posti_totali: z.coerce.number().int().min(1, "Almeno 1 posto"),
    immagine_url: z.string().trim().url().optional().or(z.literal("")),
    stato: z.enum(["bozza", "pubblicato", "archiviato"]),
  })
  .refine((d) => new Date(d.data_fine) >= new Date(d.data_inizio), {
    message: "La data di fine deve essere uguale o successiva all'inizio",
    path: ["data_fine"],
  });

export type EventoInput = z.infer<typeof eventoSchema>;
