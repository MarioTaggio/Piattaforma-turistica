import type { Metadata } from "next";
import Link from "next/link";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { SearchInput } from "@/components/admin/search-input";
import { FilterSelect } from "@/components/admin/filter-select";
import { CsvExportButton } from "@/components/admin/csv-export-button";
import { ProductActions } from "@/components/admin/content-actions";
import {
  DataTable,
  TableBody,
  TableHead,
  Td,
  Th,
} from "@/components/admin/data-table";
import {
  DEFAULT_PAGE_SIZE,
  parsePage,
  totalPages,
} from "@/lib/admin/pagination";
import { formatEurFromCents, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Shop — Admin" };

const DISPONIBILE_OPTIONS = [
  { value: "true", label: "Disponibili" },
  { value: "false", label: "Non disponibili" },
];

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function AdminShopPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const dispRaw = sp.disponibile as string | undefined;
  const { page, pageSize, offset } = parsePage(sp, DEFAULT_PAGE_SIZE);

  const supabase = createAdminClient();
  let query = supabase
    .from("shop_prodotti")
    .select(
      "id, nome, categoria, prezzo_cents, disponibile, shop_id, shops:shop_id(nome, gestore_id, users:gestore_id(nome, cognome, email))",
      { count: "exact" },
    );
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.or(`nome.ilike.${like},categoria.ilike.${like}`);
  }
  if (dispRaw === "true") query = query.eq("disponibile", true);
  if (dispRaw === "false") query = query.eq("disponibile", false);

  const { data, count } = await query
    .order("nome", { ascending: true })
    .range(offset, offset + pageSize - 1);

  const total = count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shop — Tutti i prodotti"
        subtitle={`${formatNumber(total)} prodotti su tutti gli shop.`}
        actions={<CsvExportButton href="/api/admin/exports/shop" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Cerca prodotto o categoria…"
          className="sm:max-w-sm sm:flex-1"
        />
        <FilterSelect
          paramName="disponibile"
          options={DISPONIBILE_OPTIONS}
          placeholder="Tutti"
        />
      </div>

      <DataTable page={page} totalPages={totalPages(total, pageSize)}>
        <TableHead>
          <Th>Prodotto</Th>
          <Th>Shop</Th>
          <Th>Gestore</Th>
          <Th>Categoria</Th>
          <Th>Prezzo</Th>
          <Th>Stato</Th>
          <Th />
        </TableHead>
        <TableBody>
          {(data ?? []).length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                Nessun prodotto.
              </td>
            </tr>
          )}
          {((data ?? []) as unknown as Array<{
            id: string;
            nome: string;
            categoria: string | null;
            prezzo_cents: number;
            disponibile: boolean;
            shop_id: string;
            shops: {
              nome: string;
              gestore_id: string;
              users: { nome: string | null; cognome: string | null; email: string } | null;
            } | null;
          }>).map((p) => {
            const u = p.shops?.users;
            const fullName = [u?.nome, u?.cognome].filter(Boolean).join(" ").trim();
            return (
              <tr key={p.id} className="hover:bg-muted/30">
                <Td className="font-medium">{p.nome}</Td>
                <Td className="text-xs">{p.shops?.nome ?? "—"}</Td>
                <Td className="text-xs">
                  {p.shops?.gestore_id ? (
                    <Link
                      href={`/dashboard/admin/utenti/${p.shops.gestore_id}`}
                      className="hover:underline"
                    >
                      {fullName || u?.email || "—"}
                    </Link>
                  ) : (
                    "—"
                  )}
                </Td>
                <Td className="text-xs text-muted-foreground">{p.categoria ?? "—"}</Td>
                <Td className="text-xs">{formatEurFromCents(p.prezzo_cents)}</Td>
                <Td>
                  <span
                    className={
                      p.disponibile
                        ? "inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700"
                        : "inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    }
                  >
                    {p.disponibile ? "Disponibile" : "Nascosto"}
                  </span>
                </Td>
                <Td>
                  <ProductActions id={p.id} disponibile={p.disponibile} />
                </Td>
              </tr>
            );
          })}
        </TableBody>
      </DataTable>
    </div>
  );
}
