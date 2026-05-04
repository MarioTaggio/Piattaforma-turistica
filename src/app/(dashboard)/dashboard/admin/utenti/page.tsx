import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { FilterSelect } from "@/components/admin/filter-select";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import {
  DataTable,
  TableBody,
  TableHead,
  Td,
  Th,
} from "@/components/admin/data-table";
import { DEFAULT_PAGE_SIZE, parsePage, totalPages } from "@/lib/admin/pagination";
import { formatDate } from "@/lib/utils/format";
import type { AppRole } from "@/types/database";

export const metadata: Metadata = {
  title: "Utenti — Admin",
};

const ROLE_OPTIONS: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "utente", label: "Utente" },
  { value: "gestore_eventi", label: "Gestore Eventi" },
  { value: "gestore_bnb", label: "Gestore B&B" },
  { value: "gestore_ristorante", label: "Gestore Ristorante" },
  { value: "gestore_shop", label: "Gestore Shop" },
  { value: "gestore_video", label: "Gestore Video" },
  { value: "gestore_infopoint", label: "Gestore Infopoint" },
];

const ROLE_LABEL = Object.fromEntries(
  ROLE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<AppRole, string>;

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function AdminUtentiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const role = (sp.role as string | undefined) as AppRole | undefined;
  const { page, pageSize, offset } = parsePage(sp, DEFAULT_PAGE_SIZE);

  const supabase = createAdminClient();

  // If filtering by role, first fetch matching user_ids.
  let userIdsForRole: string[] | null = null;
  if (role) {
    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", role);
    userIdsForRole = ((roleRows ?? []) as { user_id: string }[]).map(
      (r) => r.user_id,
    );
    if (userIdsForRole.length === 0) userIdsForRole = ["00000000-0000-0000-0000-000000000000"];
  }

  let query = supabase
    .from("users")
    .select("id, email, nome, cognome, created_at", { count: "exact" });

  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(
      `email.ilike.${like},nome.ilike.${like},cognome.ilike.${like}`,
    );
  }
  if (userIdsForRole) {
    query = query.in("id", userIdsForRole);
  }

  const { data: users, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const ids = ((users ?? []) as { id: string }[]).map((u) => u.id);

  const { data: rolesAll } = ids.length
    ? await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", ids)
    : { data: [] as { user_id: string; role: AppRole }[] };

  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of (rolesAll ?? []) as { user_id: string; role: AppRole }[]) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }

  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Utenti"
        subtitle={`${total.toLocaleString("it-IT")} utenti registrati sulla piattaforma.`}
        actions={<CsvExportButton href="/api/admin/exports/utenti" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Cerca per nome o email…"
          className="sm:max-w-sm sm:flex-1"
        />
        <FilterSelect
          paramName="role"
          options={ROLE_OPTIONS}
          placeholder="Tutti i ruoli"
        />
      </div>

      <DataTable page={page} totalPages={totalPages(total, pageSize)}>
        <TableHead>
          <Th>Utente</Th>
          <Th>Ruoli</Th>
          <Th>Registrato</Th>
          <Th />
        </TableHead>
        <TableBody>
          {(users ?? []).length === 0 && (
            <tr>
              <td
                colSpan={4}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                Nessun utente trovato.
              </td>
            </tr>
          )}
          {((users ?? []) as unknown as Array<{
            id: string;
            email: string;
            nome: string | null;
            cognome: string | null;
            created_at: string;
          }>).map((u) => {
            const fullName = [u.nome, u.cognome].filter(Boolean).join(" ").trim();
            const roles = rolesByUser.get(u.id) ?? [];
            return (
              <tr key={u.id} className="hover:bg-muted/30">
                <Td>
                  <div className="font-medium">{fullName || u.email}</div>
                  {fullName && (
                    <div className="text-xs text-muted-foreground">
                      {u.email}
                    </div>
                  )}
                </Td>
                <Td>
                  {roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {roles.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-brand-700"
                        >
                          {ROLE_LABEL[r] ?? r}
                        </span>
                      ))}
                    </div>
                  )}
                </Td>
                <Td className="text-xs text-muted-foreground">
                  {formatDate(u.created_at)}
                </Td>
                <Td className="text-right">
                  <Link
                    href={`/dashboard/admin/utenti/${u.id}`}
                    className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline"
                  >
                    Apri
                    <ChevronRight className="size-3.5" />
                  </Link>
                </Td>
              </tr>
            );
          })}
        </TableBody>
      </DataTable>
    </div>
  );
}
