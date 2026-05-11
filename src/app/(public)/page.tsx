import Link from "next/link";
import {
  CalendarDays,
  Hotel,
  Landmark,
  PlayCircle,
  Sparkles,
  Store,
  UtensilsCrossed,
  Compass,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/public/listing-card";
import { SectionHeading } from "@/components/public/section-heading";
import { formatDateTime, formatEurFromCents } from "@/lib/utils/format";

export default async function HomePage() {
  const supabase = createAdminClient();
  const tHero = await getTranslations("hero");
  const tNav = await getTranslations("nav");
  const tMod = await getTranslations("modules");
  const tCommon = await getTranslations("common");

  const [
    { data: eventi },
    { data: strutture },
    { data: ristoranti },
    { data: prodotti },
    { data: corsi },
    { data: attrazioni },
    { data: tour },
  ] = await Promise.all([
    supabase
      .from("eventi")
      .select(
        "id, titolo, descrizione, citta, luogo, data_inizio, prezzo_cents, immagine_url, prenotazione_attiva",
      )
      .eq("stato", "pubblicato")
      .order("data_inizio", { ascending: true })
      .limit(3),
    supabase
      .from("strutture")
      .select("id, nome, descrizione, citta, immagini, prenotazione_attiva")
      .eq("stato", "pubblicato")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("ristoranti")
      .select(
        "id, nome, descrizione, citta, tipo_cucina, immagini, prenotazione_attiva",
      )
      .eq("stato", "pubblicato")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("shop_prodotti")
      .select(
        "id, nome, descrizione, prezzo_cents, immagine_url, shops:shop_id(nome, stato)",
      )
      .eq("disponibile", true)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("corsi")
      .select(
        "id, titolo, descrizione, livello, prezzo_cents, immagine_copertina",
      )
      .eq("stato", "pubblicato")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("attrazioni")
      .select("id, nome, descrizione, citta, categoria, immagini")
      .eq("stato", "pubblicato")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("tour_virtuali")
      .select("id, titolo, descrizione, gratuito, prezzo_cents, attrazione_id")
      .eq("stato", "pubblicato")
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-700 text-white">
        <div className="absolute inset-0 -z-0 opacity-25 [background-image:radial-gradient(circle_at_top_right,rgba(255,255,255,0.3),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.18),transparent_55%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-8 px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/20">
            <Sparkles className="size-3.5" />
            {tHero("badge")}
          </span>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            {tHero("title")}
          </h1>
          <p className="max-w-2xl text-base text-white/85 sm:text-lg">
            {tHero("subtitle")}
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              size="lg"
              className="rounded-xl bg-white text-brand-700 hover:bg-white/90"
              render={<Link href="/eventi" />}
            >
              <Compass className="mr-1.5 size-4" />
              {tHero("ctaExplore")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              render={<Link href="/login" />}
            >
              {tHero("ctaLogin")}
            </Button>
          </div>

          <dl className="mt-6 grid w-full max-w-3xl grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            {[
              { label: tNav("eventi"), icon: CalendarDays },
              { label: tNav("bnb"), icon: Hotel },
              { label: tNav("ristoranti"), icon: UtensilsCrossed },
              { label: tNav("virtualTour"), icon: Landmark },
            ].map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-3 ring-1 ring-white/15"
              >
                <span className="grid size-9 place-items-center rounded-xl bg-white/15">
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* EVENTI */}
      <section className="mx-auto max-w-7xl space-y-8 px-4 pt-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={tNav("eventi")}
          title={tMod("eventi.title")}
          subtitle={tMod("eventi.subtitle")}
          ctaHref="/eventi"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {((eventi ?? []) as unknown as Array<{
            id: string;
            titolo: string;
            descrizione: string | null;
            citta: string | null;
            luogo: string;
            data_inizio: string;
            prezzo_cents: number;
            immagine_url: string | null;
            prenotazione_attiva: boolean | null;
          }>).map((e) => {
            const cta = !e.prenotazione_attiva
              ? tMod("eventi.discover")
              : e.prezzo_cents === 0
                ? tMod("eventi.registerFree")
                : tMod("eventi.buy");
            return (
              <ListingCard
                key={e.id}
                href={`/eventi/${e.id}`}
                title={e.titolo}
                description={e.descrizione}
                imageUrl={e.immagine_url}
                fallbackIcon={CalendarDays}
                meta={`${formatDateTime(e.data_inizio)} · ${e.luogo}`}
                topBadge={e.citta ?? undefined}
                price={
                  e.prezzo_cents === 0
                    ? tCommon("free")
                    : formatEurFromCents(e.prezzo_cents)
                }
                cta={cta}
              />
            );
          })}
          {(eventi ?? []).length === 0 && (
            <EmptyHomeBlock label={tMod("eventi.empty")} />
          )}
        </div>
      </section>

      {/* B&B */}
      <section className="mx-auto max-w-7xl space-y-8 px-4 pt-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={tNav("bnb")}
          title={tMod("bnb.title")}
          subtitle={tMod("bnb.subtitle")}
          ctaHref="/bnb"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {((strutture ?? []) as unknown as Array<{
            id: string;
            nome: string;
            descrizione: string | null;
            citta: string;
            immagini: string[];
            prenotazione_attiva: boolean | null;
          }>).map((s) => (
            <ListingCard
              key={s.id}
              href={`/bnb/${s.id}`}
              title={s.nome}
              description={s.descrizione}
              imageUrl={s.immagini?.[0] ?? null}
              fallbackIcon={Hotel}
              meta={s.citta}
              cta={s.prenotazione_attiva ? tMod("bnb.book") : tMod("bnb.discover")}
            />
          ))}
          {(strutture ?? []).length === 0 && (
            <EmptyHomeBlock label={tMod("bnb.empty")} />
          )}
        </div>
      </section>

      {/* RISTORANTI */}
      <section className="mx-auto max-w-7xl space-y-8 px-4 pt-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={tNav("ristoranti")}
          title={tMod("ristoranti.title")}
          subtitle={tMod("ristoranti.subtitle")}
          ctaHref="/ristoranti"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {((ristoranti ?? []) as unknown as Array<{
            id: string;
            nome: string;
            descrizione: string | null;
            citta: string;
            tipo_cucina: string | null;
            immagini: string[];
            prenotazione_attiva: boolean | null;
          }>).map((r) => (
            <ListingCard
              key={r.id}
              href={`/ristoranti/${r.id}`}
              title={r.nome}
              description={r.descrizione}
              imageUrl={r.immagini?.[0] ?? null}
              fallbackIcon={UtensilsCrossed}
              meta={r.tipo_cucina ?? r.citta}
              topBadge={r.citta}
              cta={
                r.prenotazione_attiva
                  ? tMod("ristoranti.book")
                  : tMod("ristoranti.discover")
              }
            />
          ))}
          {(ristoranti ?? []).length === 0 && (
            <EmptyHomeBlock label={tMod("ristoranti.empty")} />
          )}
        </div>
      </section>

      {/* SHOP */}
      <section className="mx-auto max-w-7xl space-y-8 px-4 pt-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={tNav("shop")}
          title={tMod("shop.title")}
          subtitle={tMod("shop.subtitle")}
          ctaHref="/shop"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {((prodotti ?? []) as unknown as Array<{
            id: string;
            nome: string;
            descrizione: string | null;
            prezzo_cents: number;
            immagine_url: string | null;
            shops: { nome: string; stato: string } | null;
          }>)
            .filter((p) => p.shops?.stato === "pubblicato")
            .slice(0, 4)
            .map((p) => (
              <ListingCard
                key={p.id}
                href={`/shop/${p.id}`}
                title={p.nome}
                description={p.descrizione}
                imageUrl={p.immagine_url}
                fallbackIcon={Store}
                meta={p.shops?.nome}
                price={formatEurFromCents(p.prezzo_cents)}
                cta={tMod("shop.view")}
              />
            ))}
          {(prodotti ?? []).length === 0 && (
            <EmptyHomeBlock label={tMod("shop.empty")} />
          )}
        </div>
      </section>

      {/* VIDEO */}
      <section className="mx-auto max-w-7xl space-y-8 px-4 pt-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={tNav("videolezioni")}
          title={tMod("video.title")}
          subtitle={tMod("video.subtitle")}
          ctaHref="/videolezioni"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {((corsi ?? []) as unknown as Array<{
            id: string;
            titolo: string;
            descrizione: string | null;
            livello: string | null;
            prezzo_cents: number;
            immagine_copertina: string | null;
          }>).map((c) => (
            <ListingCard
              key={c.id}
              href={`/videolezioni/${c.id}`}
              title={c.titolo}
              description={c.descrizione}
              imageUrl={c.immagine_copertina}
              fallbackIcon={PlayCircle}
              meta={c.livello ?? tNav("videolezioni")}
              price={
                c.prezzo_cents === 0
                  ? tCommon("free")
                  : formatEurFromCents(c.prezzo_cents)
              }
              cta={tMod("video.view")}
            />
          ))}
          {(corsi ?? []).length === 0 && (
            <EmptyHomeBlock label={tMod("video.empty")} />
          )}
        </div>
      </section>

      {/* INFOPOINT */}
      <section className="mx-auto max-w-7xl space-y-8 px-4 pt-16 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={tNav("infopoint")}
          title={tMod("infopoint.title")}
          subtitle={tMod("infopoint.subtitle")}
          ctaHref="/infopoint"
        />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {((attrazioni ?? []) as unknown as Array<{
            id: string;
            nome: string;
            descrizione: string | null;
            citta: string;
            categoria: string | null;
            immagini: string[];
          }>).map((a) => (
            <ListingCard
              key={a.id}
              href={`/infopoint/${a.id}`}
              title={a.nome}
              description={a.descrizione}
              imageUrl={a.immagini?.[0] ?? null}
              fallbackIcon={Landmark}
              meta={a.categoria ?? a.citta}
              topBadge={a.citta}
              cta={tMod("infopoint.view")}
            />
          ))}
          {(attrazioni ?? []).length === 0 && (
            <EmptyHomeBlock label={tMod("infopoint.empty")} />
          )}
        </div>
      </section>

      {/* VIRTUAL TOUR */}
      <section className="mx-auto max-w-7xl px-4 pb-24 pt-16 sm:px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl bg-brand-700 p-8 text-white shadow-lg sm:p-12">
          <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="space-y-4">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
                <Sparkles className="size-3.5" />
                {tNav("virtualTour")}
              </span>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                {tMod("virtualTour.title")}
              </h2>
              <p className="max-w-xl text-white/85">
                {tMod("virtualTour.subtitle")}
              </p>
              <div className="flex gap-3 pt-2">
                <Button
                  size="lg"
                  className="rounded-xl bg-white text-brand-700 hover:bg-white/90"
                  render={<Link href="/virtual-tour" />}
                >
                  {tMod("virtualTour.cta")}
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {((tour ?? []) as unknown as Array<{
                id: string;
                titolo: string;
                descrizione: string | null;
                gratuito: boolean;
                prezzo_cents: number;
                attrazione_id: string;
              }>).map((t) => (
                <Link
                  key={t.id}
                  href={`/infopoint/${t.attrazione_id}`}
                  className="block rounded-2xl bg-white/10 p-4 transition hover:bg-white/15"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold">
                        {t.titolo}
                      </p>
                      {t.descrizione && (
                        <p className="line-clamp-2 text-xs text-white/75">
                          {t.descrizione}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider">
                      {t.gratuito || t.prezzo_cents === 0
                        ? tCommon("free")
                        : formatEurFromCents(t.prezzo_cents)}
                    </span>
                  </div>
                </Link>
              ))}
              {(tour ?? []).length === 0 && (
                <p className="rounded-2xl bg-white/10 p-4 text-sm text-white/80">
                  {tMod("virtualTour.empty")}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function EmptyHomeBlock({ label }: { label: string }) {
  return (
    <div className="col-span-full rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

