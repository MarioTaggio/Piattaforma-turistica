import type { Metadata } from "next";
import Link from "next/link";
import {
  ShoppingBag,
  CalendarDays,
  Truck,
  ChefHat,
  PackageCheck,
  Compass,
  Clock,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "I miei ordini — Piattaforma Turistica",
};

type RistoranteOrdineRow = {
  id: string;
  totale_cents: number;
  tipo: string;
  stato: string;
  stato_pagamento: string;
  note: string | null;
  created_at: string;
  ristoranti: { nome: string; citta: string } | null;
  ordini_prodotti: {
    id: string;
    quantita: number;
    prezzo_unitario_cents: number;
    prodotti: { nome: string } | null;
  }[];
};

type ShopOrdineRow = {
  id: string;
  totale_cents: number;
  stato: string;
  stato_pagamento: string;
  note: string | null;
  created_at: string;
  shops: { nome: string; citta: string | null } | null;
  ordini_shop_prodotti: {
    id: string;
    quantita: number;
    prezzo_unitario_cents: number;
    shop_prodotti: { nome: string } | null;
  }[];
};

type Ordine = {
  id: string;
  kind: "ristorante" | "shop";
  source: string;
  totale_cents: number;
  tipo: string | null;
  stato: string;
  stato_pagamento: string;
  created_at: string;
  voci: {
    id: string;
    nome: string;
    quantita: number;
    prezzo_unitario_cents: number;
  }[];
};

// Le label di TIPO_LABEL e STAGES vengono ora risolte a runtime da
// useTranslations dentro la pagina (mappa key → t("order.tipo_*")) per
// supportare i18n. La struttura resta una const con `key` icona.
const TIPO_KEYS = ["asporto", "consegna", "al_tavolo"] as const;

const STAGES = [
  { key: "in_attesa", t: "stage_received", icon: Clock },
  { key: "in_preparazione", t: "stage_preparing", icon: ChefHat },
  { key: "pronto", t: "stage_ready", icon: PackageCheck },
  { key: "consegnato", t: "stage_delivered", icon: Truck },
] as const;
void TIPO_KEYS;

function stageIndex(stato: string): number {
  if (stato === "annullato") return -1;
  const i = STAGES.findIndex((s) => s.key === stato);
  return i === -1 ? 0 : i;
}

export default async function OrdiniPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const tOrder = await getTranslations("order");

  const [{ data: ristoranteRows }, { data: shopRows }] = await Promise.all([
    supabase
      .from("ordini")
      .select(
        `id, totale_cents, tipo, stato, stato_pagamento, note, created_at,
         ristoranti ( nome, citta ),
         ordini_prodotti ( id, quantita, prezzo_unitario_cents, prodotti ( nome ) )`,
      )
      .eq("utente_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("ordini_shop")
      .select(
        `id, totale_cents, stato, stato_pagamento, note, created_at,
         shops ( nome, citta ),
         ordini_shop_prodotti ( id, quantita, prezzo_unitario_cents, shop_prodotti ( nome ) )`,
      )
      .eq("utente_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const ristoranteOrdini = (ristoranteRows ?? []) as unknown as RistoranteOrdineRow[];
  const shopOrdini = (shopRows ?? []) as unknown as ShopOrdineRow[];

  const ordini: Ordine[] = [
    ...ristoranteOrdini.map<Ordine>((o) => ({
      id: o.id,
      kind: "ristorante",
      source: o.ristoranti?.nome ?? "Ristorante eliminato",
      totale_cents: o.totale_cents,
      tipo: o.tipo,
      stato: o.stato,
      stato_pagamento: o.stato_pagamento,
      created_at: o.created_at,
      voci: o.ordini_prodotti.map((r) => ({
        id: r.id,
        nome: r.prodotti?.nome ?? "Prodotto eliminato",
        quantita: r.quantita,
        prezzo_unitario_cents: r.prezzo_unitario_cents,
      })),
    })),
    ...shopOrdini.map<Ordine>((o) => ({
      id: o.id,
      kind: "shop",
      source: o.shops?.nome ?? "Shop eliminato",
      totale_cents: o.totale_cents,
      tipo: null,
      stato: o.stato,
      stato_pagamento: o.stato_pagamento,
      created_at: o.created_at,
      voci: o.ordini_shop_prodotti.map((r) => ({
        id: r.id,
        nome: r.shop_prodotti?.nome ?? "Prodotto eliminato",
        quantita: r.quantita,
        prezzo_unitario_cents: r.prezzo_unitario_cents,
      })),
    })),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  return (
    <div className="space-y-6">
      <PageHeader
        title={tOrder("title")}
        subtitle={tOrder("subtitle")}
      />

      {ordini.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title={tOrder("noOrders")}
          description={tOrder("noOrdersDescription")}
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                render={<Link href="/ristoranti" />}
                className="rounded-xl bg-brand-600 hover:bg-brand-700"
              >
                <Compass className="mr-1.5 size-4" />
                {tOrder("exploreRestaurants")}
              </Button>
              <Button
                variant="outline"
                render={<Link href="/shop" />}
                className="rounded-xl"
              >
                <Store className="mr-1.5 size-4" />
                {tOrder("goToShop")}
              </Button>
            </div>
          }
        />
      ) : (
        <div className="space-y-4">
          {ordini.map((o) => {
            const itemsCount = o.voci.reduce(
              (s, r) => s + (r.quantita ?? 0),
              0,
            );
            const isAnnullato = o.stato === "annullato";
            const currentStage = stageIndex(o.stato);
            const KindIcon = o.kind === "shop" ? Store : UtensilsCrossed;

            return (
              <article
                key={`${o.kind}-${o.id}`}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <KindIcon className="size-3" />
                      {o.kind === "shop" ? tOrder("shopLabel") : tOrder("restaurantLabel")}
                    </p>
                    <h3 className="text-base font-semibold">{o.source}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {formatDateTime(o.created_at)}
                      {o.tipo && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px]">
                          {(() => {
                            try {
                              return tOrder(`tipo_${o.tipo}` as Parameters<typeof tOrder>[0]);
                            } catch {
                              return o.tipo;
                            }
                          })()}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge kind="ordine" value={o.stato} />
                    <StatusBadge
                      kind="pagamento"
                      value={o.stato_pagamento}
                    />
                  </div>
                </header>

                {!isAnnullato && (
                  <ol className="mt-5 grid grid-cols-4 gap-1">
                    {STAGES.map((s, i) => {
                      const reached = i <= currentStage;
                      const Icon = s.icon;
                      return (
                        <li
                          key={s.key}
                          className="flex flex-col items-center gap-1.5"
                        >
                          <span
                            className={cn(
                              "grid size-8 place-items-center rounded-full ring-1 ring-inset",
                              reached
                                ? "bg-brand-600 text-white ring-brand-700"
                                : "bg-muted text-muted-foreground ring-border",
                            )}
                          >
                            <Icon className="size-4" />
                          </span>
                          <span
                            className={cn(
                              "text-[11px] text-center",
                              reached ? "text-foreground" : "text-muted-foreground",
                            )}
                          >
                            {tOrder(s.t)}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                )}

                <div className="mt-5 space-y-1 border-t border-border pt-3 text-sm">
                  {o.voci.slice(0, 4).map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="truncate text-foreground/80">
                        <span className="text-muted-foreground">
                          {r.quantita}×
                        </span>{" "}
                        {r.nome}
                      </span>
                      <span className="text-muted-foreground">
                        {formatEurFromCents(
                          r.prezzo_unitario_cents * r.quantita,
                        )}
                      </span>
                    </div>
                  ))}
                  {o.voci.length > 4 && (
                    <p className="pt-1 text-xs text-muted-foreground">
                      {tOrder("andOthers")} {o.voci.length - 4} {tOrder("products")}…
                    </p>
                  )}
                </div>

                <footer className="mt-4 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {formatNumber(itemsCount)} {tOrder("items")}
                  </span>
                  <span className="text-base font-semibold">
                    {formatEurFromCents(o.totale_cents)}
                  </span>
                </footer>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
