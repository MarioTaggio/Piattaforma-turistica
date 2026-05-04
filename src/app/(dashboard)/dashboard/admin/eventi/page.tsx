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
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";
import type { StatoPubblicazione } from "@/types/database";

export const metadata: Metadata = { title: "Eventi — Admin" };

const STATO_OPTIONS = [
  { value: "bozza", label: "Bozza" },
  { value: "pubblicato", label: "Pubblicato" },
  { value: "archiviato", label: "Archiviato" },
];

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function AdminEventiPage({
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
    .from("eventi")
    .select(
      "id, titolo, citta, data_inizio, prezzo_cents, posti_totali, posti_disponibili, stato, gestore_id, users:gestore_id(nome, cognome, email)",
      { count: "exact" },
    );

  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`titolo.ilike.${like},citta.ilike.${like}`);
  }
  if (stato) query = query.eq("stato", stato);

  const { data, count } = await query
    .order("data_inizio", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutti gli eventi"
        subtitle={`${formatNumber(total)} eventi sulla piattaforma.`}
        actions={<CsvExportButton href="/api/admin/exports/eventi" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Cerca titolo o città…"
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
          <Th>Evento</Th>
          <Th>Gestore</Th>
          <Th>Data</Th>
          <Th>Posti</Th>
          <Th>Prezzo</Th>
          <Th>Stato</Th>
          <Th />
        </TableHead>
        <TableBody>
          {(data ?? []).length === 0 && (
            <tr>
              <td
                colSpan={7}
                className="px-4 py-12 text-center text-sm text-muted-foreground"
              >
                Nessun evento.
              </td>
            </tr>
          )}
          {((data ?? []) as unknown as Array<{
            id: string;
            titolo: string;
            citta: string | null;
            data_inizio: string;
            prezzo_cents: number;
            posti_totali: number;
            posti_disponibili: number;
            stato: StatoPubblicazione;
            gestore_id: string;
            users: { nome: string | null; cognome: string | null; email: string } | null;
          }>).map((e) => {
            const venduti = e.posti_totali - e.posti_disponibili;
            const fullName = [e.users?.nome, e.users?.cognome]
              .filter(Boolean)
              .join(" ")
              .trim();
            return (
              <tr key={e.id} className="hover:bg-muted/30">
                <Td>
                  <div className="font-medium">{e.titolo}</div>
                  {e.citta && (
                    <div className="text-xs text-muted-foreground">
                      {e.citta}
                    </div>
                  )}
                </Td>
                <Td className="text-xs">
                  <Link
                    href={`/dashboard/admin/utenti/${e.gestore_id}`}
                    className="hover:underline"
                  >
                    {fullName || e.users?.email || "—"}
                  </Link>
                </Td>
                <Td className="text-xs text-muted-foreground">
                  {formatDateTime(e.data_inizio)}
                </Td>
                <Td className="text-xs">
                  {venduti}/{e.posti_totali}
                </Td>
                <Td className="text-xs">
                  {e.prezzo_cents === 0
                    ? "Gratis"
                    : formatEurFromCents(e.prezzo_cents)}
                </Td>
                <Td>
                  <StatusBadge kind="pubblicazione" value={e.stato} />
                </Td>
                <Td>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      href={`/dashboard/eventi/${e.id}`}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      title="Modifica"
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <ContentActions kind="eventi" id={e.id} stato={e.stato} />
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
