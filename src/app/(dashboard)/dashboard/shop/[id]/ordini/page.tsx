import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ChefHat,
  Clock,
  Package,
  Truck,
} from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FilterSelect } from "@/components/admin/filter-select";
import { SearchInput } from "@/components/admin/search-input";
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
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";
import { StatusBadge } from "@/components/dashboard/status-badge";

import { OrdineActions } from "../../_components/ordine-actions";
import { OrdineEditDialog } from "./_edit-dialog";

export const metadata: Metadata = {
  title: "Ordini shop — Piattaforma Turistica",
};

const STATO_OPTIONS = [
  { value: "in_attesa", label: "In attesa" },
  { value: "in_preparazione", label: "In preparazione" },
  { value: "pronto", label: "Pronto" },
  { value: "consegnato", label: "Consegnato" },
  { value: "annullato", label: "Annullato" },
];

type SearchParams = { [k: string]: string | string[] | undefined };

// Riga ordine "piatta" come arriva da ordini_shop, prima del merge.
type OrdineFlat = {
  id: string;
  shop_id: string;
  utente_id: string;
  totale_cents: number;
  metodo_pagamento: "online" | "alla_consegna";
  metodo_spedizione: "standard" | "express" | "ritiro";
  stato: string;
  stato_pagamento: string;
  shipping_nome: string | null;
  shipping_cognome: string | null;
  shipping_email: string | null;
  shipping_telefono: string | null;
  shipping_indirizzo: string | null;
  shipping_citta: string | null;
  shipping_cap: string | null;
  shipping_provincia: string | null;
  tracking_codice: string | null;
  tracking_url: string | null;
  note: string | null;
  created_at: string;
};

type UserRow = {
  id: string;
  nome: string | null;
  cognome: string | null;
  email: string;
};

type OrdineItem = {
  id: string;
  prodotto_id: string;
  nome: string;
  quantita: number;
  prezzo_unitario_cents: number;
};

type OrdineRow = OrdineFlat & {
  user: UserRow | null;
  items: OrdineItem[];
  itemsCount: number;
};

function logPgError(label: string, err: unknown) {
  if (!err) return;
  // PostgrestError ha proprietà non-enumerable: estraggo a mano message/
  // details/hint/code, e fallback su JSON.stringify per altri errori.
  const e = err as Record<string, unknown>;
  let jsonRepr = "";
  try {
    jsonRepr = JSON.stringify(err);
  } catch {
    /* circular */
  }
  console.error(`[shop/ordini] ${label}:`, {
    message: e.message,
    details: e.details,
    hint: e.hint,
    code: e.code,
    raw: jsonRepr,
  });
}

export default async function ShopOrdiniSingoloPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole("gestore_shop");
  const { id: shopId } = await params;
  const sp = await searchParams;
  const stato = (sp.stato as string | undefined) || undefined;
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const { page, pageSize, offset } = parsePage(sp, DEFAULT_PAGE_SIZE);

  const supabase = await createClient();

  // Ownership: lo shop deve appartenere al gestore loggato (admin bypassa).
  const { data: own } = await supabase
    .from("shops")
    .select("gestore_id")
    .eq("id", shopId)
    .single();
  if (!own) notFound();
  if (
    (own as { gestore_id: string }).gestore_id !== user.id &&
    !user.roles.includes("admin")
  )
    notFound();

  // Da qui in poi usiamo l'admin client (service role): bypassa RLS e ci dà
  // letture deterministiche. L'ownership è già stata verificata sopra.
  const admin = createAdminClient();

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY 1 — Lista ordini. `select("*")` per essere robusti a schema drift
  // (es. colonne aggiunte da migration successive non ancora applicate).
  // ─────────────────────────────────────────────────────────────────────────
  let listQuery = admin
    .from("ordini_shop")
    .select("*", { count: "exact" })
    .eq("shop_id", shopId);

  if (stato) listQuery = listQuery.eq("stato", stato);
  if (q) {
    const like = `%${q.replace(/[%_]/g, "")}%`;
    listQuery = listQuery.or(
      `shipping_nome.ilike.${like},shipping_cognome.ilike.${like},shipping_email.ilike.${like}`,
    );
  }

  const {
    data: flatRows,
    count,
    error: listErr,
  } = await listQuery
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);
  if (listErr) logPgError("list query", listErr);

  const flat = (flatRows ?? []) as OrdineFlat[];
  const total = count ?? 0;

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY 2 — Dati utente per i SOLI ordini della pagina corrente
  // ─────────────────────────────────────────────────────────────────────────
  const utenteIds = Array.from(new Set(flat.map((r) => r.utente_id)));
  const usersById = new Map<string, UserRow>();
  if (utenteIds.length > 0) {
    const { data: usersData, error: usersErr } = await admin
      .from("users")
      .select("id, nome, cognome, email")
      .in("id", utenteIds);
    if (usersErr) logPgError("users query", usersErr);
    for (const u of (usersData ?? []) as UserRow[]) usersById.set(u.id, u);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY 3 — Line items completi (per il modal modifica)
  //          + lookup nomi prodotti per id (query 3b)
  // ─────────────────────────────────────────────────────────────────────────
  const pageOrderIds = flat.map((r) => r.id);
  const itemsByOrder = new Map<string, OrdineItem[]>();
  if (pageOrderIds.length > 0) {
    const { data: itemsData, error: itemsErr } = await admin
      .from("ordini_shop_prodotti")
      .select("id, ordine_id, prodotto_id, quantita, prezzo_unitario_cents")
      .in("ordine_id", pageOrderIds);
    if (itemsErr) logPgError("items query", itemsErr);

    type ItemRaw = {
      id: string;
      ordine_id: string;
      prodotto_id: string;
      quantita: number;
      prezzo_unitario_cents: number;
    };
    const items = (itemsData ?? []) as ItemRaw[];

    // 3b) Nomi prodotti per id
    const prodottoIds = Array.from(new Set(items.map((r) => r.prodotto_id)));
    const namesById = new Map<string, string>();
    if (prodottoIds.length > 0) {
      const { data: prodData, error: prodErr } = await admin
        .from("shop_prodotti")
        .select("id, nome")
        .in("id", prodottoIds);
      if (prodErr) logPgError("prodotti names query", prodErr);
      for (const p of (prodData ?? []) as { id: string; nome: string }[]) {
        namesById.set(p.id, p.nome);
      }
    }

    for (const r of items) {
      const arr = itemsByOrder.get(r.ordine_id) ?? [];
      arr.push({
        id: r.id,
        prodotto_id: r.prodotto_id,
        nome: namesById.get(r.prodotto_id) ?? "Prodotto eliminato",
        quantita: r.quantita,
        prezzo_unitario_cents: r.prezzo_unitario_cents,
      });
      itemsByOrder.set(r.ordine_id, arr);
    }
  }

  // Merge finale
  const ordini: OrdineRow[] = flat.map((o) => {
    const items = itemsByOrder.get(o.id) ?? [];
    return {
      ...o,
      user: usersById.get(o.utente_id) ?? null,
      items,
      itemsCount: items.reduce((s, it) => s + it.quantita, 0),
    };
  });

  // ─────────────────────────────────────────────────────────────────────────
  // QUERY 4 — Stats su TUTTI gli ordini di questo shop (non paginati)
  // ─────────────────────────────────────────────────────────────────────────
  const { data: statsRows, error: statsErr } = await admin
    .from("ordini_shop")
    .select("totale_cents, stato, stato_pagamento")
    .eq("shop_id", shopId);
  if (statsErr) logPgError("stats query", statsErr);
  const stats = (
    (statsRows ?? []) as Array<{
      totale_cents: number;
      stato: string;
      stato_pagamento: string;
    }>
  ).reduce(
    (acc, r) => {
      acc.count += 1;
      if (r.stato === "in_attesa") acc.daProcessare += 1;
      if (r.stato_pagamento === "pagato") acc.incassato += r.totale_cents;
      return acc;
    },
    { count: 0, daProcessare: 0, incassato: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Package}
          label="Ordini totali"
          value={formatNumber(stats.count)}
        />
        <StatCard
          icon={Clock}
          label="Da processare"
          value={formatNumber(stats.daProcessare)}
          accent
        />
        <StatCard
          icon={CheckCircle2}
          label="Incassato"
          value={formatEurFromCents(stats.incassato)}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          placeholder="Cerca per nome o email cliente…"
          className="sm:max-w-sm sm:flex-1"
        />
        <FilterSelect
          paramName="stato"
          options={STATO_OPTIONS}
          placeholder="Tutti gli stati"
        />
      </div>

      {ordini.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nessun ordine"
          description="Quando arriverà un ordine sui prodotti di questo shop apparirà qui."
        />
      ) : (
        <DataTable page={page} totalPages={totalPages(total, pageSize)}>
          <TableHead>
            <Th>Ordine</Th>
            <Th>Cliente</Th>
            <Th className="text-center">Articoli</Th>
            <Th className="text-right">Totale</Th>
            <Th>Stato</Th>
            <Th>Pagamento</Th>
            <Th />
          </TableHead>
          <TableBody>
            {ordini.map((o) => {
              const orderNumber = o.id.slice(0, 8).toUpperCase();
              const customerName =
                [o.user?.nome, o.user?.cognome].filter(Boolean).join(" ") ||
                [o.shipping_nome, o.shipping_cognome].filter(Boolean).join(" ");
              const customerEmail = o.user?.email ?? o.shipping_email ?? "";
              return (
                <tr key={o.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="font-mono text-xs">#{orderNumber}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {formatDateTime(o.created_at)}
                    </div>
                  </Td>
                  <Td>
                    <div className="font-medium">{customerName || "—"}</div>
                    <div className="text-xs text-muted-foreground">
                      {customerEmail}
                    </div>
                    {o.shipping_citta && (
                      <div className="text-[11px] text-muted-foreground">
                        {o.shipping_citta}
                      </div>
                    )}
                  </Td>
                  <Td className="text-center text-sm">{o.itemsCount}</Td>
                  <Td className="text-right text-sm font-semibold">
                    {formatEurFromCents(o.totale_cents)}
                  </Td>
                  <Td>
                    <StatusBadge kind="ordine" value={o.stato} />
                    {o.tracking_codice && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Truck className="size-3" />
                        {o.tracking_codice}
                      </div>
                    )}
                  </Td>
                  <Td>
                    <StatusBadge kind="pagamento" value={o.stato_pagamento} />
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {o.metodo_pagamento === "alla_consegna"
                        ? "Alla consegna"
                        : "Online"}
                    </div>
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-col items-end gap-1.5">
                      <OrdineEditDialog
                        ordine={{
                          id: o.id,
                          shop_id: o.shop_id,
                          utente_id: o.utente_id,
                          totale_cents: o.totale_cents,
                          stato: o.stato,
                          stato_pagamento: o.stato_pagamento,
                          metodo_spedizione: o.metodo_spedizione,
                          shipping_nome: o.shipping_nome,
                          shipping_cognome: o.shipping_cognome,
                          shipping_email: o.shipping_email,
                          shipping_telefono: o.shipping_telefono,
                          shipping_indirizzo: o.shipping_indirizzo,
                          shipping_citta: o.shipping_citta,
                          shipping_cap: o.shipping_cap,
                          shipping_provincia: o.shipping_provincia,
                          tracking_codice: o.tracking_codice,
                          tracking_url: o.tracking_url,
                          note: o.note,
                          items: o.items,
                        }}
                      />
                      <OrdineActions
                        ordineId={o.id}
                        shopId={o.shop_id}
                        currentStato={o.stato}
                        hasTracking={!!o.tracking_codice}
                      />
                    </div>
                  </Td>
                </tr>
              );
            })}
          </TableBody>
        </DataTable>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof ChefHat;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold">{value}</p>
        </div>
        <span
          className={`grid size-9 place-items-center rounded-xl ${
            accent ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand-700"
          }`}
        >
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}
