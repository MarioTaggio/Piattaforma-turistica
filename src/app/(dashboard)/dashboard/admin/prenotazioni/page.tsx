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
  formatDate,
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";

export const metadata: Metadata = { title: "Prenotazioni — Admin" };

const TIPO_OPTIONS = [
  { value: "bnb", label: "B&B" },
  { value: "tavolo", label: "Tavolo" },
  { value: "visita", label: "Visita" },
];

const STATO_OPTIONS = [
  { value: "in_attesa", label: "In attesa" },
  { value: "confermata", label: "Confermata" },
  { value: "cancellata", label: "Cancellata" },
  { value: "completata", label: "Completata" },
  { value: "no_show", label: "No-show" },
];

type Row = {
  id: string;
  tipo: "bnb" | "tavolo" | "visita";
  created_at: string;
  utente: string;
  oggetto: string;
  quando: string | null;
  stato: string;
  totaleCents: number | null;
};

type SearchParams = { [k: string]: string | string[] | undefined };

export default async function AdminPrenotazioniPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const tipo = (sp.tipo as string | undefined) ?? "";
  const stato = (sp.stato as string | undefined) ?? "";
  const { page, pageSize, offset } = parsePage(sp, DEFAULT_PAGE_SIZE);

  const supabase = createAdminClient();

  const wantBnb = !tipo || tipo === "bnb";
  const wantTavolo = !tipo || tipo === "tavolo";
  const wantVisita = !tipo || tipo === "visita";

  async function fetchBnb() {
    if (!wantBnb) return { data: [] as unknown[] };
    let q = supabase
      .from("prenotazioni_bnb")
      .select(
        "id, created_at, data_check_in, data_check_out, prezzo_totale_cents, stato, users:utente_id(nome, cognome, email), camere:camera_id(strutture:struttura_id(nome))",
      );
    if (stato) q = q.eq("stato", stato);
    return q.order("created_at", { ascending: false });
  }
  async function fetchTavolo() {
    if (!wantTavolo) return { data: [] as unknown[] };
    let q = supabase
      .from("prenotazioni_tavolo")
      .select(
        "id, created_at, data_ora, num_ospiti, stato, users:utente_id(nome, cognome, email), tavoli:tavolo_id(numero, ristoranti:ristorante_id(nome))",
      );
    if (stato) q = q.eq("stato", stato);
    return q.order("created_at", { ascending: false });
  }
  async function fetchVisita() {
    if (!wantVisita) return { data: [] as unknown[] };
    let q = supabase
      .from("prenotazioni_visita")
      .select(
        "id, created_at, prezzo_totale_cents, num_partecipanti, stato, users:utente_id(nome, cognome, email), visite_guidate:visita_id(titolo, data_ora)",
      );
    if (stato) q = q.eq("stato", stato);
    return q.order("created_at", { ascending: false });
  }

  const [bnbRes, tavoloRes, visitaRes] = await Promise.all([
    fetchBnb(),
    fetchTavolo(),
    fetchVisita(),
  ]);

  function name(u: { nome: string | null; cognome: string | null; email: string } | null | undefined) {
    if (!u) return "—";
    const full = [u.nome, u.cognome].filter(Boolean).join(" ").trim();
    return full || u.email;
  }

  const all: Row[] = [];

  for (const r of (bnbRes.data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    data_check_in: string;
    data_check_out: string;
    prezzo_totale_cents: number;
    stato: string;
    users: { nome: string | null; cognome: string | null; email: string } | null;
    camere: { strutture: { nome: string } | null } | null;
  }>) {
    all.push({
      id: `bnb-${r.id}`,
      tipo: "bnb",
      created_at: r.created_at,
      utente: name(r.users),
      oggetto: r.camere?.strutture?.nome ?? "Struttura",
      quando: `${formatDate(r.data_check_in)} → ${formatDate(r.data_check_out)}`,
      stato: r.stato,
      totaleCents: r.prezzo_totale_cents,
    });
  }
  for (const r of (tavoloRes.data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    data_ora: string;
    num_ospiti: number;
    stato: string;
    users: { nome: string | null; cognome: string | null; email: string } | null;
    tavoli: { numero: string; ristoranti: { nome: string } | null } | null;
  }>) {
    all.push({
      id: `tavolo-${r.id}`,
      tipo: "tavolo",
      created_at: r.created_at,
      utente: name(r.users),
      oggetto: `${r.tavoli?.ristoranti?.nome ?? "Ristorante"} · tavolo ${r.tavoli?.numero ?? "—"}`,
      quando: `${formatDateTime(r.data_ora)} · ${r.num_ospiti} ospiti`,
      stato: r.stato,
      totaleCents: null,
    });
  }
  for (const r of (visitaRes.data ?? []) as unknown as Array<{
    id: string;
    created_at: string;
    prezzo_totale_cents: number;
    num_partecipanti: number;
    stato: string;
    users: { nome: string | null; cognome: string | null; email: string } | null;
    visite_guidate: { titolo: string; data_ora: string } | null;
  }>) {
    all.push({
      id: `visita-${r.id}`,
      tipo: "visita",
      created_at: r.created_at,
      utente: name(r.users),
      oggetto: r.visite_guidate?.titolo ?? "Visita",
      quando: `${formatDateTime(r.visite_guidate?.data_ora ?? "")} · ${r.num_partecipanti}p`,
      stato: r.stato,
      totaleCents: r.prezzo_totale_cents,
    });
  }

  all.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  const total = all.length;
  const visible = all.slice(offset, offset + pageSize);

  const TIPO_LABEL: Record<Row["tipo"], { label: string; color: string }> = {
    bnb: { label: "B&B", color: "bg-emerald-50 text-emerald-700" },
    tavolo: { label: "Tavolo", color: "bg-amber-50 text-amber-700" },
    visita: { label: "Visita", color: "bg-violet-50 text-violet-700" },
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tutte le prenotazioni"
        subtitle={`${formatNumber(total)} prenotazioni B&B, tavoli e visite.`}
        actions={<CsvExportButton href="/api/admin/exports/prenotazioni" />}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput placeholder="Filtri rapidi…" className="sm:max-w-sm sm:flex-1" />
        <FilterSelect paramName="tipo" options={TIPO_OPTIONS} placeholder="Tutti i tipi" />
        <FilterSelect paramName="stato" options={STATO_OPTIONS} placeholder="Tutti gli stati" />
      </div>

      <DataTable page={page} totalPages={totalPages(total, pageSize)}>
        <TableHead>
          <Th>Tipo</Th>
          <Th>Utente</Th>
          <Th>Oggetto</Th>
          <Th>Quando</Th>
          <Th>Stato</Th>
          <Th>Totale</Th>
          <Th>Creata</Th>
        </TableHead>
        <TableBody>
          {visible.length === 0 && (
            <tr>
              <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                Nessuna prenotazione.
              </td>
            </tr>
          )}
          {visible.map((r) => (
            <tr key={r.id} className="hover:bg-muted/30">
              <Td>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${TIPO_LABEL[r.tipo].color}`}
                >
                  {TIPO_LABEL[r.tipo].label}
                </span>
              </Td>
              <Td className="text-xs">{r.utente}</Td>
              <Td className="text-xs">{r.oggetto}</Td>
              <Td className="text-xs text-muted-foreground">{r.quando}</Td>
              <Td>
                <StatusBadge kind="prenotazione" value={r.stato} />
              </Td>
              <Td className="text-xs">
                {r.totaleCents !== null ? formatEurFromCents(r.totaleCents) : "—"}
              </Td>
              <Td className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</Td>
            </tr>
          ))}
        </TableBody>
      </DataTable>
    </div>
  );
}
