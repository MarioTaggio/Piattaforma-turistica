import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { SearchInput } from "@/components/admin/search-input";
import {
  DataTable,
  TableBody,
  TableHead,
  Td,
  Th,
} from "@/components/admin/data-table";
import { DEFAULT_PAGE_SIZE, parsePage, totalPages } from "@/lib/admin/pagination";
import { formatNumber } from "@/lib/utils/format";
import type { AppRole } from "@/types/database";

import { GestoreApprove, RevokeRoleButton } from "./_components/gestore-actions";

export const metadata: Metadata = {
  title: "Gestori — Admin",
};

const GESTORE_ROLES: AppRole[] = [
  "gestore_eventi",
  "gestore_bnb",
  "gestore_ristorante",
  "gestore_shop",
  "gestore_video",
  "gestore_infopoint",
];

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  gestore_eventi: { label: "Eventi", color: "bg-violet-50 text-violet-700" },
  gestore_bnb: { label: "B&B", color: "bg-emerald-50 text-emerald-700" },
  gestore_ristorante: {
    label: "Ristoranti",
    color: "bg-amber-50 text-amber-700",
  },
  gestore_shop: { label: "Shop", color: "bg-teal-50 text-teal-700" },
  gestore_video: { label: "Video", color: "bg-sky-50 text-sky-700" },
  gestore_infopoint: { label: "Infopoint", color: "bg-rose-50 text-rose-700" },
};

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function AdminGestoriPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const { page, pageSize, offset } = parsePage(sp, DEFAULT_PAGE_SIZE);

  const supabase = createAdminClient();
  const tDashboard = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("user_id, role")
    .in("role", GESTORE_ROLES);

  const rolesByUser = new Map<string, AppRole[]>();
  for (const r of (roleRows ?? []) as { user_id: string; role: AppRole }[]) {
    const arr = rolesByUser.get(r.user_id) ?? [];
    arr.push(r.role);
    rolesByUser.set(r.user_id, arr);
  }

  let allIds = Array.from(rolesByUser.keys());
  const totalGestori = allIds.length;

  // Fetch user profiles in chunks (filter by search) then paginate.
  let users: Array<{
    id: string;
    email: string;
    nome: string | null;
    cognome: string | null;
    created_at: string;
  }> = [];
  if (allIds.length) {
    let query = supabase
      .from("users")
      .select("id, email, nome, cognome, created_at")
      .in("id", allIds);
    if (q) {
      const like = `%${q.replace(/[%_]/g, "")}%`;
      query = query.or(
        `email.ilike.${like},nome.ilike.${like},cognome.ilike.${like}`,
      );
    }
    const { data } = await query.order("email", { ascending: true });
    users = (data ?? []) as typeof users;
  }

  // Counts per gestore for each module.
  const ids = users.map((u) => u.id);
  const [
    { data: eventiCounts },
    { data: bnbCounts },
    { data: ristCounts },
    { data: videoCounts },
    { data: infoCounts },
  ] = ids.length
    ? await Promise.all([
        supabase.from("eventi").select("gestore_id").in("gestore_id", ids),
        supabase.from("strutture").select("gestore_id").in("gestore_id", ids),
        supabase.from("ristoranti").select("gestore_id").in("gestore_id", ids),
        supabase.from("corsi").select("gestore_id").in("gestore_id", ids),
        supabase.from("attrazioni").select("gestore_id").in("gestore_id", ids),
      ])
    : [
        { data: [] as { gestore_id: string }[] },
        { data: [] as { gestore_id: string }[] },
        { data: [] as { gestore_id: string }[] },
        { data: [] as { gestore_id: string }[] },
        { data: [] as { gestore_id: string }[] },
      ];

  function tally(rows: { gestore_id: string }[] | null | undefined) {
    const m = new Map<string, number>();
    for (const r of rows ?? []) m.set(r.gestore_id, (m.get(r.gestore_id) ?? 0) + 1);
    return m;
  }
  const tEv = tally(eventiCounts as { gestore_id: string }[]);
  const tBnb = tally(bnbCounts as { gestore_id: string }[]);
  const tR = tally(ristCounts as { gestore_id: string }[]);
  const tV = tally(videoCounts as { gestore_id: string }[]);
  const tA = tally(infoCounts as { gestore_id: string }[]);

  // Apply pagination after filter.
  const totalFiltered = users.length;
  const visible = users.slice(offset, offset + pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title={tDashboard("gestori")}
        subtitle={`${formatNumber(totalGestori)} gestori attivi sulla piattaforma.`}
      />

      <SectionCard
        title="Approvazioni"
        subtitle="Assegna un nuovo ruolo gestore a un utente esistente."
      >
        <GestoreApprove />
      </SectionCard>

      <SearchInput
        placeholder={tCommon("searchPlaceholder")}
        className="max-w-sm"
      />

      <DataTable page={page} totalPages={totalPages(totalFiltered, pageSize)}>
        <TableHead>
          <Th>{tDashboard("gestori")}</Th>
          <Th>{tDashboard("administration")}</Th>
          <Th className="text-center">{tDashboard("eventi")}</Th>
          <Th className="text-center">{tDashboard("bnb")}</Th>
          <Th className="text-center">{tDashboard("ristoranti")}</Th>
          <Th className="text-center">{tDashboard("video")}</Th>
          <Th className="text-center">{tDashboard("infopoint")}</Th>
          <Th />
        </TableHead>
        <TableBody>
          {visible.length === 0 && (
            <tr>
              <td
                colSpan={8}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                Nessun gestore trovato.
              </td>
            </tr>
          )}
          {visible.map((u) => {
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
                  <div className="flex flex-wrap gap-1">
                    {roles.map((r) => {
                      const meta = ROLE_BADGE[r];
                      return (
                        <span
                          key={r}
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${meta?.color ?? "bg-muted text-muted-foreground"}`}
                        >
                          {meta?.label ?? r}
                          <RevokeRoleButton userId={u.id} role={r} />
                        </span>
                      );
                    })}
                  </div>
                </Td>
                <Td className="text-center text-sm">{tEv.get(u.id) ?? 0}</Td>
                <Td className="text-center text-sm">{tBnb.get(u.id) ?? 0}</Td>
                <Td className="text-center text-sm">{tR.get(u.id) ?? 0}</Td>
                <Td className="text-center text-sm">{tV.get(u.id) ?? 0}</Td>
                <Td className="text-center text-sm">{tA.get(u.id) ?? 0}</Td>
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
