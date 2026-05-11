import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

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

export const metadata: Metadata = { title: "Ordini — Admin" };

const STATO_OPTIONS = [
  { value: "in_attesa", label: "In attesa" },
  { value: "in_preparazione", label: "In preparazione" },
  { value: "pronto", label: "Pronto" },
  { value: "consegnato", label: "Consegnato" },
  { value: "annullato", label: "Annullato" },
];

const PAGAMENTO_OPTIONS = [
  { value: "in_attesa", label: "Pagamento in attesa" },
  { value: "pagato", label: "Pagato" },
  { value: "fallito", label: "Fallito" },
  { value: "rimborsato", label: "Rimborsato" },
];

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function AdminOrdiniPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const stato = (sp.stato as string | undefined) ?? "";
  const pagamento = (sp.pagamento as string | undefined) ?? "";
  const { page, pageSize, offset } = parsePage(sp, DEFAULT_PAGE_SIZE);

  const supabase = createAdminClient();
  const tDashboard = await getTranslations("dashboard");
  const tPg = await getTranslations("prenotazioniGestore");
  const tCommon = await getTranslations("common");
  let query = supabase
    .from("ordini")
    .select(
      "id, created_at, totale_cents, tipo, stato, stato_pagamento, ristoranti:ristorante_id(id, nome), users:utente_id(nome, cognome, email)",
      { count: "exact" },
    );
  if (stato) query = query.eq("stato", stato);
  if (pagamento) query = query.eq("stato_pagamento", pagamento);

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={tDashboard("ordini")}
        subtitle={`${formatNumber(total)} ordini ricevuti.`}
        actions={<CsvExportButton href="/api/admin/exports/ordini" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder={tCommon("searchPlaceholder")} className="sm:max-w-sm sm:flex-1" />
        <FilterSelect paramName="stato" options={STATO_OPTIONS} placeholder="Tutti gli stati" />
        <FilterSelect paramName="pagamento" options={PAGAMENTO_OPTIONS} placeholder="Pagamento" />
      </div>

      <DataTable page={page} totalPages={totalPages(total, pageSize)}>
        <TableHead>
          <Th>{tPg("columnDate")}</Th>
          <Th>{tPg("columnCustomer")}</Th>
          <Th>{tDashboard("ristoranti")}</Th>
          <Th>{tPg("columnGuests")}</Th>
          <Th>{tPg("columnStatus")}</Th>
          <Th>{tPg("columnPayment")}</Th>
          <Th>{tPg("columnAmount")}</Th>
          <Th>{tPg("columnDate")}</Th>
        </TableHead>
        <TableBody>
          {(data ?? []).length === 0 && (
            <tr>
              <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                {tPg("noBookings")}
              </td>
            </tr>
          )}
          {((data ?? []) as unknown as Array<{
            id: string;
            created_at: string;
            totale_cents: number;
            tipo: string;
            stato: string;
            stato_pagamento: string;
            ristoranti: { id: string; nome: string } | null;
            users: { nome: string | null; cognome: string | null; email: string } | null;
          }>).map((o) => {
            const fullName = [o.users?.nome, o.users?.cognome].filter(Boolean).join(" ").trim();
            return (
              <tr key={o.id} className="hover:bg-muted/30">
                <Td className="font-mono text-[10px] uppercase text-muted-foreground">
                  {o.id.slice(0, 8)}
                </Td>
                <Td className="text-xs">{fullName || o.users?.email || "—"}</Td>
                <Td className="text-xs">
                  {o.ristoranti ? (
                    <Link
                      href={`/dashboard/admin/utenti/${o.ristoranti.id}`}
                      className="hover:underline"
                    >
                      {o.ristoranti.nome}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="text-xs capitalize text-muted-foreground">
                  {o.tipo.replace("_", " ")}
                </Td>
                <Td>
                  <StatusBadge kind="ordine" value={o.stato} />
                </Td>
                <Td>
                  <StatusBadge kind="pagamento" value={o.stato_pagamento} />
                </Td>
                <Td className="text-xs font-medium">{formatEurFromCents(o.totale_cents)}</Td>
                <Td className="text-xs text-muted-foreground">{formatDateTime(o.created_at)}</Td>
              </tr>
            );
          })}
        </TableBody>
      </DataTable>
    </div>
  );
}
