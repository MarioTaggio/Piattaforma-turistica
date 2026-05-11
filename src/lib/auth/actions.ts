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
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? "https";
      return `${proto}://${host}`;
    }
  } catch {
    // headers() può fallire in alcuni contesti edge: fallback al dominio prod.
  }
  return "https://borghion.it";
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
  const redirectTo = `${siteUrl}/api/auth/callback?type=recovery`;

  // Don't leak whether the email exists — always succeed from the user's POV.
  // Errori veri (redirect non whitelisted, rate limit, SMTP down) vengono
  // loggati lato server per il debug ma NON tornano al client.
  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo },
  );
  if (error) {
    console.error("[auth] resetPasswordForEmail failed:", {
      email: parsed.data.email,
      redirectTo,
      code: error.code,
      message: error.message,
      status: error.status,
    });
  }

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

  const { nome, cognome, username, telefono, avatar_url } = parsed.data;

  const { error } = await supabase
    .from("users")
    .update({
      nome,
      cognome,
      username: username ? username.toLowerCase() : null,
      telefono: telefono || null,
      avatar_url: avatar_url || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Username già in uso" };
    }
    return { error: error.message };
  }

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
