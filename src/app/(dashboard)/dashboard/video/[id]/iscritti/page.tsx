import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChartBar, Euro, Users, Video } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/dashboard/empty-state";
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
  formatDate,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";
import { ComunicazioneButton } from "@/components/dashboard/comunicazione-button";
import { MassComunicazioneButton } from "@/components/dashboard/mass-comunicazione-button";

export const metadata: Metadata = {
  title: "Iscritti corso — Piattaforma Turistica",
};

type SearchParams = { [k: string]: string | string[] | undefined };

type IscrittoRow = {
  id: string;
  prezzo_pagato_cents: number;
  created_at: string;
  utente_id: string;
  users: {
    nome: string | null;
    cognome: string | null;
    email: string;
  } | null;
};

export default async function CorsoIscrittiPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const user = await requireRole("gestore_video");
  const { id } = await params;
  const sp = await searchParams;
  const q = (sp.q as string | undefined)?.trim() ?? "";
  const { page, pageSize, offset } = parsePage(sp, DEFAULT_PAGE_SIZE);

  const supabase = await createClient();

  const { data: corsoRow } = await supabase
    .from("corsi")
    .select("id, titolo, prezzo_cents, gestore_id")
    .eq("id", id)
    .single();
  if (!corsoRow) notFound();
  const corso = corsoRow as {
    id: string;
    titolo: string;
    prezzo_cents: number;
    gestore_id: string;
  };
  if (corso.gestore_id !== user.id && !user.roles.includes("admin"))
    notFound();

  // Stats su tutti gli acquisti (non paginati) — include utente_id per il
  // bottone "Comunica a tutti" che invia a tutti gli iscritti, non solo a
  // quelli visibili nella pagina corrente.
  const { data: allRows } = await supabase
    .from("acquisti_video")
    .select("prezzo_pagato_cents, utente_id")
    .eq("corso_id", id);
  const all = (allRows ?? []) as {
    prezzo_pagato_cents: number;
    utente_id: string;
  }[];
  const stats = all.reduce(
    (acc, r) => {
      acc.count += 1;
      acc.revenue += r.prezzo_pagato_cents;
      return acc;
    },
    { count: 0, revenue: 0 },
  );
  const allUserIds = all.map((r) => r.utente_id);

  // Lista paginata con join utente
  let query = supabase
    .from("acquisti_video")
    .select(
      `id, prezzo_pagato_cents, created_at, utente_id,
       users:utente_id ( nome, cognome, email )`,
      { count: "exact" },
    )
    .eq("corso_id", id);

  if (q) {
    // Filtra per email (poi sui results applico filter aggiuntivo per nome/cognome).
    const like = `%${q.replace(/[%_]/g, "")}%`;
    query = query.ilike("users.email", like);
  }

  const { data, count } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  let iscritti = ((data ?? []) as unknown) as IscrittoRow[];

  if (q) {
    const needle = q.toLowerCase();
    iscritti = iscritti.filter((i) => {
      if (!i.users) return false;
      const fullName = `${i.users.nome ?? ""} ${i.users.cognome ?? ""}`
        .toLowerCase()
        .trim();
      return (
        i.users.email.toLowerCase().includes(needle) ||
        fullName.includes(needle)
      );
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Chi ha acquistato &laquo;{corso.titolo}&raquo; e quanto hai incassato.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          icon={Users}
          label="Iscritti totali"
          value={formatNumber(stats.count)}
        />
        <StatCard
          icon={Euro}
          label="Revenue corso"
          value={formatEurFromCents(stats.revenue)}
          accent
        />
        <StatCard
          icon={ChartBar}
          label="Prezzo attuale"
          value={formatEurFromCents(corso.prezzo_cents)}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          placeholder="Cerca per nome o email…"
          className="max-w-sm"
        />
        <MassComunicazioneButton
          userIds={allUserIds}
          modulo="Corso video"
          riferimento={corso.titolo}
          link="/dashboard/corsi"
        />
      </div>

      {iscritti.length === 0 ? (
        <EmptyState
          icon={Video}
          title={q ? "Nessun iscritto trovato" : "Nessun iscritto ancora"}
          description={
            q
              ? "Prova a cambiare i filtri."
              : "Promuovi il tuo corso per ricevere i primi acquisti."
          }
        />
      ) : (
        <DataTable
          page={page}
          totalPages={totalPages(count ?? 0, pageSize)}
        >
          <TableHead>
            <Th>Studente</Th>
            <Th>Email</Th>
            <Th>Acquistato</Th>
            <Th className="text-right">Pagato</Th>
            <Th className="text-right">Azioni</Th>
          </TableHead>
          <TableBody>
            {iscritti.map((i) => {
              const fullName = [i.users?.nome, i.users?.cognome]
                .filter(Boolean)
                .join(" ")
                .trim();
              return (
                <tr key={i.id} className="hover:bg-muted/30">
                  <Td>
                    <div className="font-medium">
                      {fullName || i.users?.email || "—"}
                    </div>
                  </Td>
                  <Td className="text-sm text-muted-foreground">
                    {i.users?.email}
                  </Td>
                  <Td className="text-xs text-muted-foreground">
                    {formatDate(i.created_at)}
                  </Td>
                  <Td className="text-right text-sm font-semibold">
                    {formatEurFromCents(i.prezzo_pagato_cents)}
                  </Td>
                  <Td className="text-right">
                    <ComunicazioneButton
                      userId={i.utente_id}
                      modulo="Corso video"
                      riferimento={corso.titolo}
                      link="/dashboard/corsi"
                    />
                  </Td>
                </tr>
              );
            })}
          </TableBody>
        </DataTable>
      )}

      <p className="text-xs text-muted-foreground">
        Nota: il tracciamento del progresso lezione-per-lezione richiede una
        tabella `video_progressi` non ancora presente nel modello dati. Possiamo
        aggiungerla in una migrazione successiva quando vorrai mostrare la
        percentuale di completamento.
      </p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Users;
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
            accent ? "bg-emerald-100 text-emerald-700" : "bg-brand-50 text-brand-700"
          }`}
        >
          <Icon className="size-4" />
        </span>
      </div>
    </div>
  );
}
