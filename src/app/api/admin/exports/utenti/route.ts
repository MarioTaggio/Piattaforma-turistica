import { requireRole } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import { csvResponse, toCsv } from "@/lib/admin/csv";
import type { AppRole } from "@/types/database";

export const runtime = "nodejs";

export async function GET(req: Request) {
  await requireRole("admin");
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const role = url.searchParams.get("role") as AppRole | null;

  const supabase = createAdminClient();

  let userIdsForRole: string[] | null = null;
  if (role) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", role);
    userIdsForRole = ((roleRows ?? []) as { user_id: string }[]).map(
      (r) => r.user_id,
    );
    if (userIdsForRole.length === 0)
      userIdsForRole = ["00000000-0000-0000-0000-000000000000"];
  }

  let query = supabase
    .from("users")
    .select("id, email, nome, cognome, telefono, created_at");
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(
      `email.ilike.${like},nome.ilike.${like},cognome.ilike.${like}`,
    );
  }
  if (userIdsForRole) query = query.in("id", userIdsForRole);

  const { data: users } = await query.order("created_at", { ascending: false });
  const ids = ((users ?? []) as { id: string }[]).map((u) => u.id);
  const { data: rolesAll } = ids.length
    ? await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids)
    : { data: [] as { user_id: string; role: AppRole }[] };

  const rolesByUser = new Map<string, string[]>();
  for (const r of (rolesAll ?? []) as { user_id: string; role: AppRole }[]) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }

  const rows = ((users ?? []) as unknown as Array<{
    id: string;
    email: string;
    nome: string | null;
    cognome: string | null;
    telefono: string | null;
    created_at: string;
  }>).map((u) => ({
    id: u.id,
    email: u.email,
    nome: u.nome ?? "",
    cognome: u.cognome ?? "",
    telefono: u.telefono ?? "",
    ruoli: (rolesByUser.get(u.id) ?? []).join("|"),
    registrato_il: u.created_at,
  }));

  const csv = toCsv(rows, [
    { key: "id", header: "id" },
    { key: "email", header: "email" },
    { key: "nome", header: "nome" },
    { key: "cognome", header: "cognome" },
    { key: "telefono", header: "telefono" },
    { key: "ruoli", header: "ruoli" },
    { key: "registrato_il", header: "registrato_il" },
  ]);

  return csvResponse(`utenti_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
