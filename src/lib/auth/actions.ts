"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  changePasswordSchema,
  type LoginInput,
  type RegisterInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
  type ChangePasswordInput,
} from "@/lib/auth/schemas";

export type ActionResult = { error: string } | { success: true };

async function getSiteUrl(): Promise<string> {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl) return envUrl.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  return `${proto}://${host}`;
}

export async function signIn(input: LoginInput): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    if (error.code === "invalid_credentials") {
      return { error: "Email o password non corretti" };
    }
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signUp(input: RegisterInput): Promise<ActionResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const { nome, cognome, email, password } = parsed.data;
  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { nome, cognome },
      emailRedirectTo: `${siteUrl}/api/auth/callback`,
    },
  });

  if (error) {
    if (error.code === "user_already_exists") {
      return { error: "Esiste già un account con questa email" };
    }
    return { error: error.message };
  }

  return { success: true };
}

export async function requestPasswordReset(
  input: ResetPasswordInput,
): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "Email non valida" };

  const supabase = await createClient();
  const siteUrl = await getSiteUrl();

  // Don't leak whether the email exists — always succeed from the user's POV.
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl}/api/auth/callback?next=/dashboard/profilo`,
  });

  return { success: true };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<ActionResult> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessione scaduta. Accedi di nuovo." };

  const { nome, cognome, telefono, avatar_url } = parsed.data;

  const { error } = await supabase
    .from("users")
    .update({
      nome,
      cognome,
      telefono: telefono || null,
      avatar_url: avatar_url || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/profilo");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<ActionResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { error: "Dati non validi" };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.newPassword,
  });

  if (error) {
    if (error.code === "same_password") {
      return { error: "La nuova password è identica a quella attuale" };
    }
    return { error: error.message };
  }
  return { success: true };
}
