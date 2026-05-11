import { z } from "zod";

export const recensioneTargetSchema = z
  .object({
    evento_id: z.string().uuid().optional(),
    struttura_id: z.string().uuid().optional(),
    ristorante_id: z.string().uuid().optional(),
    prodotto_id: z.string().uuid().optional(),
    corso_id: z.string().uuid().optional(),
    attrazione_id: z.string().uuid().optional(),
  })
  .refine(
    (d) =>
      Object.values(d).filter((v) => v !== undefined && v !== "").length === 1,
    { message: "Specifica esattamente un contenuto da recensire" },
  );

export const recensioneSchema = z
  .object({
    voto: z.coerce.number().int().min(1).max(5),
    titolo: z.string().trim().min(3).max(120),
    testo: z.string().trim().min(10).max(2000),
    evento_id: z.string().uuid().optional(),
    struttura_id: z.string().uuid().optional(),
    ristorante_id: z.string().uuid().optional(),
    prodotto_id: z.string().uuid().optional(),
    corso_id: z.string().uuid().optional(),
    attrazione_id: z.string().uuid().optional(),
  })
  .refine(
    (d) =>
      [
        d.evento_id,
        d.struttura_id,
        d.ristorante_id,
        d.prodotto_id,
        d.corso_id,
        d.attrazione_id,
      ].filter((v) => v !== undefined && v !== "").length === 1,
    { message: "Specifica esattamente un contenuto da recensire" },
  );

export const respondToRecensioneSchema = z.object({
  id: z.string().uuid(),
  risposta: z.string().trim().min(3).max(2000),
});

export const rejectRecensioneSchema = z.object({
  id: z.string().uuid(),
  motivazione: z.string().trim().max(500).optional().or(z.literal("")),
});

export type RecensioneInput = z.infer<typeof recensioneSchema>;
export type RespondToRecensioneInput = z.infer<typeof respondToRecensioneSchema>;
export type RejectRecensioneInput = z.infer<typeof rejectRecensioneSchema>;

export type RecensioneTarget = {
  evento_id?: string | null;
  struttura_id?: string | null;
  ristorante_id?: string | null;
  prodotto_id?: string | null;
  corso_id?: string | null;
  attrazione_id?: string | null;
};
