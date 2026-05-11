import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  Ticket,
  Users,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { getSessionUser } from "@/lib/auth/dal";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";
import { ReviewsSection } from "@/components/recensioni/reviews-section";

import { BuyTicketButton } from "./_components/buy-button";

export const metadata: Metadata = { title: "Evento — Piattaforma Turistica" };

export default async function EventoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();
  const tNav = await getTranslations("nav");
  const tDetail = await getTranslations("detail");
  const tCommon = await getTranslations("common");
  const tMod = await getTranslations("modules");

  const [{ data: evento }, sessionUser] = await Promise.all([
    supabase
      .from("eventi")
      .select(
        "id, titolo, descrizione, data_inizio, data_fine, luogo, citta, prezzo_cents, posti_totali, posti_disponibili, immagine_url, stato, prenotazione_attiva",
      )
      .eq("id", id)
      .single(),
    getSessionUser(),
  ]);

  let buyerData: {
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
  } | undefined;
  if (sessionUser) {
    const { data: profileRow } = await supabase
      .from("users")
      .select("nome, cognome, telefono")
      .eq("id", sessionUser.id)
      .maybeSingle();
    const p = profileRow as {
      nome: string | null;
      cognome: string | null;
      telefono: string | null;
    } | null;
    buyerData = {
      nome: p?.nome ?? sessionUser.nome ?? "",
      cognome: p?.cognome ?? sessionUser.cognome ?? "",
      email: sessionUser.email,
      telefono: p?.telefono ?? "",
    };
  }

  if (!evento || (evento as { stato: string }).stato !== "pubblicato")
    notFound();

  const e = evento as {
    id: string;
    titolo: string;
    descrizione: string | null;
    data_inizio: string;
    data_fine: string;
    luogo: string;
    citta: string | null;
    prezzo_cents: number;
    posti_totali: number;
    posti_disponibili: number;
    immagine_url: string | null;
    prenotazione_attiva: boolean | null;
  };

  const sold = e.posti_totali - e.posti_disponibili;
  const soldOut = e.posti_disponibili <= 0;
  const venditaAttiva = !!e.prenotazione_attiva;

  return (
    <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/eventi"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {tDetail("backToAll")}
      </Link>

      <div className="mt-6 overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="relative aspect-[16/7] bg-brand-50">
          {e.immagine_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={e.immagine_url}
              alt={e.titolo}
              className="size-full object-cover"
            />
          ) : (
            <div className="grid size-full place-items-center text-brand-700/50">
              <Ticket className="size-16" />
            </div>
          )}
          {e.citta && (
            <span className="absolute left-4 top-4 inline-flex items-center rounded-full bg-white/95 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-700 shadow-sm">
              {e.citta}
            </span>
          )}
        </div>

        <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">
                {tNav("eventi")}
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {e.titolo}
              </h1>
            </div>

            {e.descrizione && (
              <p className="whitespace-pre-line text-base leading-relaxed text-foreground/80">
                {e.descrizione}
              </p>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <InfoRow icon={Calendar} label={tDetail("start")} value={formatDateTime(e.data_inizio)} />
              <InfoRow icon={Clock} label={tDetail("end")} value={formatDateTime(e.data_fine)} />
              <InfoRow icon={MapPin} label={tDetail("location")} value={`${e.luogo}${e.citta ? ` · ${e.citta}` : ""}`} />
              <InfoRow
                icon={Users}
                label={tDetail("seats")}
                value={`${formatNumber(sold)} ${tDetail("seatsSold")} ${formatNumber(e.posti_totali)}`}
              />
            </div>
          </div>

          <aside className="space-y-4 rounded-2xl border border-border bg-muted/20 p-5">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                {tDetail("ticketPrice")}
              </p>
              <p className="mt-1 text-3xl font-semibold text-foreground">
                {e.prezzo_cents === 0 ? tCommon("free") : formatEurFromCents(e.prezzo_cents)}
              </p>
            </div>

            {venditaAttiva ? (
              <>
                <div className="rounded-xl bg-brand-50 px-3 py-2 text-xs font-medium text-brand-700">
                  {soldOut
                    ? tDetail("soldOutMessage")
                    : `${formatNumber(e.posti_disponibili)} ${tDetail("seatsAvailable")}`}
                </div>

                <BuyTicketButton
                  eventoId={e.id}
                  disabled={soldOut}
                  buyer={buyerData}
                  label={
                    soldOut
                      ? tCommon("soldOut")
                      : e.prezzo_cents === 0
                        ? tMod("eventi.registerFree")
                        : tMod("eventi.buy")
                  }
                />

                <p className="text-[11px] text-muted-foreground">
                  {tDetail("ticketsHint")}
                </p>
              </>
            ) : (
              <div className="rounded-xl bg-muted/50 px-3 py-3 text-xs text-muted-foreground">
                {tDetail("bookingsDisabledEvent")}
              </div>
            )}
          </aside>
        </div>
      </div>

      <div className="mt-12">
        <ReviewsSection target={{ evento_id: e.id }} />
      </div>
    </article>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
}
