import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { AppRole } from "@/types/database";

export type SessionUser = {
  id: string;
  email: string;
  nome: string | null;
  cognome: string | null;
  avatar_url: string | null;
  roles: AppRole[];
};

// Validates the Supabase session and returns the user + roles.
// Returns null if there is no valid session — callers decide what to do.
// React.cache memoizes per render pass so repeated calls in the same
// request only hit Supabase once.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) return null;

  const [{ data: profile }, { data: rolesRows }] = await Promise.all([
    supabase
      .from("users")
      .select("nome, cognome, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? "",
    nome: (profile as { nome: string | null } | null)?.nome ?? null,
    cognome: (profile as { cognome: string | null } | null)?.cognome ?? null,
    avatar_url:
      (profile as { avatar_url: string | null } | null)?.avatar_url ?? null,
    roles: ((rolesRows ?? []) as { role: AppRole }[]).map((r) => r.role),
  };
});

// Use in protected pages/layouts. Redirects to /login if not authenticated.
export async function requireUser(redirectTo = "/login"): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(redirectTo);
  return user;
}

// Use to gate sector dashboards. Admin always passes.
export async function requireRole(
  role: AppRole | AppRole[],
  redirectTo = "/dashboard",
): Promise<SessionUser> {
  const user = await requireUser();
  const allowed = Array.isArray(role) ? role : [role];
  const hasAny =
    user.roles.includes("admin") ||
    allowed.some((r) => user.roles.includes(r));
  if (!hasAny) redirect(redirectTo);
  return user;
}

export function hasRole(user: SessionUser, role: AppRole): boolean {
  return user.roles.includes("admin") || user.roles.includes(role);
}
