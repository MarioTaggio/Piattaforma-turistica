import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { FilterSelect } from "@/components/admin/filter-select";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { ContentActions } from "@/components/admin/content-actions";
import {
  DataTable,
  TableBody,
  TableHead,
  Td,
  Th,
} from "@/components/admin/data-table";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  DEFAULT_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/admin/pagination";
import { formatNumber } from "@/lib/utils/format";
import type { StatoPubblicazione } from "@/types/database";

export const metadata: Metadata = { title: "Attrazioni — Admin" };

const STATO_OPTIONS = [
  { value: "bozza", label: "Bozza" },
  { value: "pubblicato", label: "Pubblicato" },
  { value: "archiviato", label: "Archiviato" },
];

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function AdminInfopointPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const stato = (sp.stato as StatoPubblicazione | undefined) ?? null;
  const { page, pageSize, offset } = parsePage(sp, DEFAULT_PAGE_SIZE);

  const supabase = createAdminClient();
  let query = supabase
    .from("attrazioni")
    .select(
      "id, nome, citta, categoria, stato, gestore_id, users:gestore_id(nome, cognome, email)",
      { count: "exact" },
    );
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(
      `nome.ilike.${like},citta.ilike.${like},categoria.ilike.${like}`,
    );
  }
  if (stato) query = query.eq("stato", stato);

  const { data, count } = await query
    .order("nome", { ascending: true })
    .range(offset, offset + pageSize - 1);

  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutte le attrazioni"
        subtitle={`${formatNumber(total)} attrazioni sulla piattaforma.`}
        actions={<CsvExportButton href="/api/admin/exports/infopoint" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Cerca nome, città o categoria…"
          className="sm:max-w-sm sm:flex-1"
        />
        <FilterSelect
          paramName="stato"
          options={STATO_OPTIONS}
          placeholder="Tutti gli stati"
        />
      </div>

      <DataTable page={page} totalPages={totalPages(total, pageSize)}>
        <TableHead>
          <Th>Attrazione</Th>
          <Th>Gestore</Th>
          <Th>Città</Th>
          <Th>Categoria</Th>
          <Th>Stato</Th>
          <Th />
        </TableHead>
        <TableBody>
          {(data ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                Nessuna attrazione.
              </td>
            </tr>
          )}
          {((data ?? []) as unknown as Array<{
            id: string;
            nome: string;
            citta: string;
            categoria: string | null;
            stato: StatoPubblicazione;
            gestore_id: string;
            users: { nome: string | null; cognome: string | null; email: string } | null;
          }>).map((a) => {
            const fullName = [a.users?.nome, a.users?.cognome].filter(Boolean).join(" ").trim();
            return (
              <tr key={a.id} className="hover:bg-muted/30">
                <Td className="font-medium">{a.nome}</Td>
                <Td className="text-xs">
                  <Link href={`/dashboard/admin/utenti/${a.gestore_id}`} className="hover:underline">
                    {fullName || a.users?.email || "—"}
                  </Link>
                </Td>
                <Td className="text-xs text-muted-foreground">{a.citta}</Td>
                <Td className="text-xs text-muted-foreground">{a.categoria ?? "—"}</Td>
                <Td>
                  <StatusBadge kind="pubblicazione" value={a.stato} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/dashboard/infopoint/${a.id}`}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Modifica"
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <ContentActions kind="infopoint" id={a.id} stato={a.stato} />
                  </div>
                </Td>
              </tr>
            );
          })}
        </TableBody>
      </DataTable>
    </div>
  );
}
