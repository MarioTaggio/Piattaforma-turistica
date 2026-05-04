import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone, Calendar } from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/dashboard/page-header";
import { SectionCard } from "@/components/admin/section-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import {
  formatDate,
  formatDateTime,
  formatEurFromCents,
} from "@/lib/utils/format";
import type { AppRole } from "@/types/database";

import { RoleManager } from "./_components/role-manager";
import { AccountToggle } from "./_components/account-toggle";

export const metadata: Metadata = {
  title: "Dettaglio utente — Admin",
};

export default async function AdminUtenteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: profile } = await supabase
    .from("users")
    .select("id, email, nome, cognome, telefono, avatar_url, created_at")
    .eq("id", id)
    .single();

  if (!profile) notFound();

  const { data: authUser } = await supabase.auth.admin.getUserById(id);
  const banned = Boolean(
    authUser?.user?.banned_until &&
      new Date(authUser.user.banned_until).getTime() > Date.now(),
  );

  const [
    { data: rolesRows },
    { data: bigliettiRows },
    { data: bnbRows },
    { data: tavoloRows },
    { data: visiteRows },
    { data: ordiniRows },
    { data: acquistiRows },
  ] = await Promise.all([
    supabase.from("user_roles").select("role").eq("user_id", id),
    supabase
      .from("biglietti")
      .select(
        "id, created_at, prezzo_pagato_cents, stato, eventi(titolo)",
      )
      .eq("utente_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("prenotazioni_bnb")
      .select(
        "id, created_at, data_check_in, data_check_out, prezzo_totale_cents, stato, camere(strutture(nome))",
      )
      .eq("utente_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("prenotazioni_tavolo")
      .select(
        "id, created_at, data_ora, num_ospiti, stato, tavoli(numero, ristoranti(nome))",
      )
      .eq("utente_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("prenotazioni_visita")
      .select(
        "id, created_at, num_partecipanti, prezzo_totale_cents, stato, visite_guidate(titolo, data_ora)",
      )
      .eq("utente_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("ordini")
      .select(
        "id, created_at, totale_cents, stato, stato_pagamento, ristoranti(nome)",
      )
      .eq("utente_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("acquisti_video")
      .select(
        "id, created_at, prezzo_pagato_cents, corsi(titolo)",
      )
      .eq("utente_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const p = profile as {
    id: string;
    email: string;
    nome: string | null;
    cognome: string | null;
    telefono: string | null;
    avatar_url: string | null;
    created_at: string;
  };

  const roles = ((rolesRows ?? []) as { role: AppRole }[]).map((r) => r.role);
  const fullName = [p.nome, p.cognome].filter(Boolean).join(" ").trim();
  const initials = (fullName || p.email)
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/admin/utenti"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Torna agli utenti
      </Link>

      <PageHeader
        title={fullName || p.email}
        subtitle={fullName ? p.email : "Utente registrato"}
        actions={<AccountToggle userId={p.id} banned={banned} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Profilo" className="lg:col-span-1">
          <div className="flex items-start gap-4">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-brand-50 text-base font-semibold text-brand-700">
              {initials || "?"}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="size-3.5" />
                {p.email}
              </div>
              {p.telefono && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="size-3.5" />
                  {p.telefono}
                </div>
              )}
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="size-3.5" />
                Iscritto il {formatDate(p.created_at)}
              </div>
              {banned && (
                <p className="rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700">
                  Account disattivato
                </p>
              )}
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Ruoli"
          subtitle="Aggiungi o rimuovi privilegi"
          className="lg:col-span-2"
        >
          <RoleManager userId={p.id} roles={roles} />
        </SectionCard>
      </div>

      <SectionCard
        title="Biglietti eventi"
        subtitle={`${bigliettiRows?.length ?? 0} acquistati`}
        bodyClassName="p-0"
      >
        {(bigliettiRows ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Nessun biglietto.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {((bigliettiRows ?? []) as unknown as Array<{
              id: string;
              created_at: string;
              prezzo_pagato_cents: number;
              stato: string;
              eventi: { titolo: string } | null;
            }>).map((b) => (
              <li key={b.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{b.eventi?.titolo ?? "Evento"}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(b.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge kind="biglietto" value={b.stato} />
                  <span className="text-sm font-semibold">{formatEurFromCents(b.prezzo_pagato_cents)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Prenotazioni B&B"
        subtitle={`${bnbRows?.length ?? 0} prenotazioni`}
        bodyClassName="p-0"
      >
        {(bnbRows ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nessuna prenotazione.</p>
        ) : (
          <ul className="divide-y divide-border">
            {((bnbRows ?? []) as unknown as Array<{
              id: string;
              created_at: string;
              data_check_in: string;
              data_check_out: string;
              prezzo_totale_cents: number;
              stato: string;
              camere: { strutture: { nome: string } | null } | null;
            }>).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{r.camere?.strutture?.nome ?? "Struttura"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.data_check_in)} → {formatDate(r.data_check_out)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge kind="prenotazione" value={r.stato} />
                  <span className="text-sm font-semibold">{formatEurFromCents(r.prezzo_totale_cents)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Prenotazioni tavolo"
        subtitle={`${tavoloRows?.length ?? 0} prenotazioni`}
        bodyClassName="p-0"
      >
        {(tavoloRows ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nessuna prenotazione.</p>
        ) : (
          <ul className="divide-y divide-border">
            {((tavoloRows ?? []) as unknown as Array<{
              id: string;
              data_ora: string;
              num_ospiti: number;
              stato: string;
              tavoli: { numero: string; ristoranti: { nome: string } | null } | null;
            }>).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{r.tavoli?.ristoranti?.nome ?? "Ristorante"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(r.data_ora)} · {r.num_ospiti} ospiti · tavolo {r.tavoli?.numero}
                  </p>
                </div>
                <StatusBadge kind="prenotazione" value={r.stato} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Visite guidate"
        subtitle={`${visiteRows?.length ?? 0} prenotazioni`}
        bodyClassName="p-0"
      >
        {(visiteRows ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nessuna prenotazione.</p>
        ) : (
          <ul className="divide-y divide-border">
            {((visiteRows ?? []) as unknown as Array<{
              id: string;
              num_partecipanti: number;
              prezzo_totale_cents: number;
              stato: string;
              visite_guidate: { titolo: string; data_ora: string } | null;
            }>).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{r.visite_guidate?.titolo ?? "Visita"}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(r.visite_guidate?.data_ora ?? "")} · {r.num_partecipanti} partecipanti
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge kind="prenotazione" value={r.stato} />
                  <span className="text-sm font-semibold">{formatEurFromCents(r.prezzo_totale_cents)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Ordini ristoranti"
        subtitle={`${ordiniRows?.length ?? 0} ordini`}
        bodyClassName="p-0"
      >
        {(ordiniRows ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nessun ordine.</p>
        ) : (
          <ul className="divide-y divide-border">
            {((ordiniRows ?? []) as unknown as Array<{
              id: string;
              created_at: string;
              totale_cents: number;
              stato: string;
              stato_pagamento: string;
              ristoranti: { nome: string } | null;
            }>).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{r.ristoranti?.nome ?? "Ristorante"}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge kind="ordine" value={r.stato} />
                  <span className="text-sm font-semibold">{formatEurFromCents(r.totale_cents)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard
        title="Corsi acquistati"
        subtitle={`${acquistiRows?.length ?? 0} acquisti`}
        bodyClassName="p-0"
      >
        {(acquistiRows ?? []).length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Nessun acquisto.</p>
        ) : (
          <ul className="divide-y divide-border">
            {((acquistiRows ?? []) as unknown as Array<{
              id: string;
              created_at: string;
              prezzo_pagato_cents: number;
              corsi: { titolo: string } | null;
            }>).map((r) => (
              <li key={r.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium">{r.corsi?.titolo ?? "Corso"}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</p>
                </div>
                <span className="text-sm font-semibold">{formatEurFromCents(r.prezzo_pagato_cents)}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
