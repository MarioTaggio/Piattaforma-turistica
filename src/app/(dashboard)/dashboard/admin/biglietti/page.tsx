import type { Metadata } from "next";

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
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  DEFAULT_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/admin/pagination";
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";

export const metadata: Metadata = { title: "Biglietti — Admin" };

const STATO_OPTIONS = [
  { value: "valido", label: "Valido" },
  { value: "utilizzato", label: "Utilizzato" },
  { value: "rimborsato", label: "Rimborsato" },
  { value: "annullato", label: "Annullato" },
];

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function AdminBigliettiPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const stato = (sp.stato as string | undefined) ?? "";
  const { page, pageSize, offset } = parsePage(sp, DEFAULT_PAGE_SIZE);

  const supabase = createAdminClient();
  let query = supabase
    .from("biglietti")
    .select(
      "id, codice, created_at, prezzo_pagato_cents, stato, eventi:evento_id(titolo, data_inizio), users:utente_id(nome, cognome, email)",
      { count: "exact" },
    );
  if (stato) query = query.eq("stato", stato);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutti i biglietti"
        subtitle={`${formatNumber(total)} biglietti emessi.`}
        actions={<CsvExportButton href="/api/admin/exports/biglietti" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Cerca…" className="sm:max-w-sm sm:flex-1" />
        <FilterSelect paramName="stato" options={STATO_OPTIONS} placeholder="Tutti gli stati" />
      </div>

      <DataTable page={page} totalPages={totalPages(total, pageSize)}>
        <TableHead>
          <Th>Codice</Th>
          <Th>Evento</Th>
          <Th>Cliente</Th>
          <Th>Stato</Th>
          <Th>Prezzo</Th>
          <Th>Acquistato</Th>
        </TableHead>
        <TableBody>
          {(data ?? []).length === 0 && (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">
                Nessun biglietto.
              </td>
            </tr>
          )}
          {((data ?? []) as unknown as Array<{
            id: string;
            codice: string;
            created_at: string;
            prezzo_pagato_cents: number;
            stato: string;
            eventi: { titolo: string; data_inizio: string } | null;
            users: { nome: string | null; cognome: string | null; email: string } | null;
          }>).map((b) => {
            const fullName = [b.users?.nome, b.users?.cognome].filter(Boolean).join(" ").trim();
            return (
              <tr key={b.id} className="hover:bg-muted/30">
                <Td className="font-mono text-[10px] uppercase text-muted-foreground">
                  {b.codice.slice(0, 8)}
                </Td>
                <Td>
                  <div className="text-xs font-medium">{b.eventi?.titolo ?? "Evento"}</div>
                  {b.eventi?.data_inizio && (
                    <div className="text-[10px] text-muted-foreground">
                      {formatDateTime(b.eventi.data_inizio)}
                    </div>
                  )}
                </Td>
                <Td className="text-xs">{fullName || b.users?.email || "—"}</Td>
                <Td>
                  <StatusBadge kind="biglietto" value={b.stato} />
                </Td>
                <Td className="text-xs font-medium">{formatEurFromCents(b.prezzo_pagato_cents)}</Td>
                <Td className="text-xs text-muted-foreground">{formatDateTime(b.created_at)}</Td>
              </tr>
            );
          })}
        </TableBody>
      </DataTable>
    </div>
  );
}
