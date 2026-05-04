"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole, StatoPubblicazione } from "@/types/database";

type Result = { error?: string; success?: true };

const CONTENT_TABLES = {
  eventi: "eventi",
  bnb: "strutture",
  ristoranti: "ristoranti",
  shop: "shop_prodotti",
  video: "corsi",
  infopoint: "attrazioni",
} as const;

export type ContentKind = keyof typeof CONTENT_TABLES;

export async function assignRole(
  userId: string,
  role: AppRole,
): Promise<Result> {
  await requireRole("admin");
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_roles")
    .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/utenti");
  revalidatePath(`/dashboard/admin/utenti/${userId}`);
  revalidatePath("/dashboard/admin/gestori");
  return { success: true };
}

export async function revokeRole(
  userId: string,
  role: AppRole,
): Promise<Result> {
  await requireRole("admin");
  const admin = createAdminClient();
  const { error } = await admin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/utenti");
  revalidatePath(`/dashboard/admin/utenti/${userId}`);
  revalidatePath("/dashboard/admin/gestori");
  return { success: true };
}

export async function setUserBanned(
  userId: string,
  banned: boolean,
): Promise<Result> {
  await requireRole("admin");
  const admin = createAdminClient();
  // Supabase Auth ban API: a long ban duration ≈ deactivation; "none" reactivates.
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? "876000h" : "none",
  });
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/utenti");
  revalidatePath(`/dashboard/admin/utenti/${userId}`);
  return { success: true };
}

export async function setContentStato(
  kind: ContentKind,
  id: string,
  stato: StatoPubblicazione,
): Promise<Result> {
  await requireRole("admin");
  const table = CONTENT_TABLES[kind];
  const admin = createAdminClient();
  const { error } = await admin.from(table).update({ stato }).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/admin/${kind}`);
  return { success: true };
}

export async function setProductDisponibile(
  id: string,
  disponibile: boolean,
): Promise<Result> {
  await requireRole("admin");
  const admin = createAdminClient();
  const { error } = await admin
    .from("shop_prodotti")
    .update({ disponibile })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/dashboard/admin/shop");
  return { success: true };
}

export async function deleteContent(
  kind: ContentKind,
  id: string,
): Promise<Result> {
  await requireRole("admin");
  const table = CONTENT_TABLES[kind];
  const admin = createAdminClient();
  const { error } = await admin.from(table).delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/dashboard/admin/${kind}`);
  return { success: true };
}
