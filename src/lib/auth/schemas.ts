import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Inserisci un'email valida"),
  password: z.string().min(1, "Inserisci la password"),
});

export const registerSchema = z
  .object({
    nome: z.string().trim().min(2, "Almeno 2 caratteri"),
    cognome: z.string().trim().min(2, "Almeno 2 caratteri"),
    email: z.string().email("Inserisci un'email valida"),
    password: z
      .string()
      .min(8, "Almeno 8 caratteri")
      .regex(/[A-Z]/, "Deve contenere una lettera maiuscola")
      .regex(/[0-9]/, "Deve contenere un numero"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

export const resetPasswordSchema = z.object({
  email: z.string().email("Inserisci un'email valida"),
});

export const updateProfileSchema = z.object({
  nome: z.string().trim().min(2, "Almeno 2 caratteri").max(60),
  cognome: z.string().trim().min(2, "Almeno 2 caratteri").max(60),
  telefono: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal("")),
  avatar_url: z
    .string()
    .trim()
    .url("URL non valido")
    .optional()
    .or(z.literal("")),
});

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Almeno 8 caratteri")
      .regex(/[A-Z]/, "Deve contenere una lettera maiuscola")
      .regex(/[0-9]/, "Deve contenere un numero"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
