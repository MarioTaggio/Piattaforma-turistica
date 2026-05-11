"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const step1Schema = z.object({
  username: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9_]{3,20}$/, "3-20 caratteri: lettere, numeri, _"),
  telefono: z.string().trim().min(4, "Telefono obbligatorio").max(20),
  data_nascita: z.string().trim().optional().or(z.literal("")),
  avatar_url: z.string().trim().url().optional().or(z.literal("")),
});

const step2Schema = z.object({
  interessi: z.array(z.string()).default([]),
  citta_preferita: z.string().trim().max(80).optional().or(z.literal("")),
  newsletter: z.coerce.boolean().default(false),
});

export type OnboardingStep1Input = z.infer<typeof step1Schema>;
export type OnboardingStep2Input = z.infer<typeof step2Schema>;

type Result = { error: string } | { success: true };

export async function saveOnboardingStep1(
  input: OnboardingStep1Input,
): Promise<Result> {
  const parsed = step1Schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dati non validi" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  const v = parsed.data;
  const { error } = await supabase
    .from("users")
    .update({
      username: v.username.toLowerCase(),
      telefono: v.telefono,
      data_nascita: v.data_nascita || null,
      avatar_url: v.avatar_url || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "Username già in uso" };
    return { error: error.message };
  }

  return { success: true };
}

export async function completeOnboarding(
  input: OnboardingStep2Input,
): Promise<Result> {
  const parsed = step2Schema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta" };

  const v = parsed.data;
  const { error } = await supabase
    .from("users")
    .update({
      interessi: v.interessi,
      citta_preferita: v.citta_preferita || null,
      newsletter: v.newsletter,
      onboarding_completato: true,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  redirect("/dashboard");
}
