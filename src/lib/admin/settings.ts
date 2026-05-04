"use server";

import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/dal";

export type ModuliAttivi = {
  eventi: boolean;
  bnb: boolean;
  ristoranti: boolean;
  shop: boolean;
  video: boolean;
  infopoint: boolean;
  virtual_tour: boolean;
};

export type Commissioni = {
  eventi: number;
  bnb: number;
  ristoranti: number;
  shop: number;
  video: number;
  infopoint: number;
};

export type PlatformSettings = {
  site_nome: string;
  site_descrizione: string | null;
  site_logo_url: string | null;
  site_color_primario: string;
  moduli_attivi: ModuliAttivi;
  commissioni: Commissioni;
  email_mittente_nome: string | null;
  email_mittente_email: string | null;
  email_oggetto_default: string | null;
  manutenzione_attiva: boolean;
  manutenzione_messaggio: string | null;
};

const DEFAULTS: PlatformSettings = {
  site_nome: "Piattaforma Turistica",
  site_descrizione: null,
  site_logo_url: null,
  site_color_primario: "#1B4332",
  moduli_attivi: {
    eventi: true,
    bnb: true,
    ristoranti: true,
    shop: true,
    video: true,
    infopoint: true,
    virtual_tour: true,
  },
  commissioni: {
    eventi: 5,
    bnb: 8,
    ristoranti: 0,
    shop: 7,
    video: 15,
    infopoint: 5,
  },
  email_mittente_nome: "Piattaforma Turistica",
  email_mittente_email: null,
  email_oggetto_default: null,
  manutenzione_attiva: false,
  manutenzione_messaggio: "Stiamo facendo manutenzione, torniamo a breve.",
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("platform_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (!data) return DEFAULTS;
  return { ...DEFAULTS, ...(data as Partial<PlatformSettings>) };
}

export async function updatePlatformSettings(
  input: PlatformSettings,
): Promise<{ error?: string; ok?: true }> {
  await requireRole("admin");
  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_settings")
    .update({
      site_nome: input.site_nome.trim() || "Piattaforma Turistica",
      site_descrizione: input.site_descrizione?.trim() || null,
      site_logo_url: input.site_logo_url?.trim() || null,
      site_color_primario: input.site_color_primario.trim() || "#1B4332",
      moduli_attivi: input.moduli_attivi,
      commissioni: input.commissioni,
      email_mittente_nome:
        input.email_mittente_nome?.trim() || "Piattaforma Turistica",
      email_mittente_email: input.email_mittente_email?.trim() || null,
      email_oggetto_default: input.email_oggetto_default?.trim() || null,
      manutenzione_attiva: input.manutenzione_attiva,
      manutenzione_messaggio:
        input.manutenzione_messaggio?.trim() ||
        "Stiamo facendo manutenzione, torniamo a breve.",
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/impostazioni");
  return { ok: true };
}
