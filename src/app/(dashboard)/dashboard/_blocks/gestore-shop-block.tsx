import {
  ShoppingBag,
  Truck,
  Wallet,
  PackageX,
} from "lucide-react";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";

import {
  BlockHeader,
  BlockShell,
  CardList,
  ListRow,
  MiniStat,
  StatGrid,
} from "./_section";

const ACCENT = "green" as const;

function startOfMonthIso(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

export async function GestoreShopBlock({ userId }: { userId: string }) {
  const supabase = createAdminClient();
  const monthStart = startOfMonthIso();

  const { data: shopsRows } = await supabase
    .from("shops")
    .select("id, nome")
    .eq("gestore_id", userId);

  const shops = (shopsRows ?? []) as { id: string; nome: string }[];
  const shopsNomeById = new Map(shops.map((s) => [s.id, s.nome]));
  const shopsIds = shops.map((s) => s.id);

  if (shopsIds.length === 0) {
    return (
      <BlockShell accent={ACCENT}>
        <BlockHeader
          emoji="🛍️"
          title="Gestione Shop"
          accent={ACCENT}
          href="/dashboard/shop"
        />
        <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Non hai ancora creato uno shop. Vai alla{" "}
          <a className="underline" href="/dashboard/shop">
            gestione shop
          </a>{" "}
          per iniziare.
        </p>
      </BlockShell>
    );
  }

  const [
    { count: ordiniInAttesa },
    { count: daSpedire },
    revenueRes,
    nonDisponibiliRes,
    ultimiOrdiniRes,
  ] = await Promise.all([
    supabase
      .from("ordini_shop")
      .select("*", { count: "exact", head: true })
      .in("shop_id", shopsIds)
      .eq("stato", "in_attesa"),
    supabase
      .from("ordini_shop")
      .select("*", { count: "exact", head: true })
      .in("shop_id", shopsIds)
      .in("stato", ["in_preparazione", "pronto"]),
    supabase
      .from("ordini_shop")
      .select("totale_cents")
      .in("shop_id", shopsIds)
      .gte("created_at", monthStart)
      .neq("stato", "annullato"),
    supabase
      .from("shop_prodotti")
      .select("id, nome, shop_id, disponibile")
      .in("shop_id", shopsIds)
      .eq("disponibile", false)
      .limit(5),
    supabase
      .from("ordini_shop")
      .select(
        "id, totale_cents, stato, created_at, shop_id, users(nome, cognome, email)",
      )
      .in("shop_id", shopsIds)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const revenueMese = (
    (revenueRes.data ?? []) as { totale_cents: number }[]
  ).reduce((s, r) => s + (r.totale_cents ?? 0), 0);

  type ProdottoNonDisp = {
    id: string;
    nome: string;
    shop_id: string;
  };
  const nonDisponibili = (nonDisponibiliRes.data ?? []) as ProdottoNonDisp[];

  type OrdineShop = {
    id: string;
    totale_cents: number;
    stato: string;
    created_at: string;
    shop_id: string;
    users: { nome: string | null; cognome: string | null; email: string } | null;
  };
  const ordini = (ultimiOrdiniRes.data ?? []) as unknown as OrdineShop[];

  return (
    <BlockShell accent={ACCENT}>
      <BlockHeader
        emoji="🛍️"
        title="Gestione Shop"
        accent={ACCENT}
        href="/dashboard/shop"
        hrefLabel="Vai agli shop"
      />

      <StatGrid>
        <MiniStat
          label="Ordini in attesa"
          value={formatNumber(ordiniInAttesa ?? 0)}
          icon={ShoppingBag}
          accent={ACCENT}
        />
        <MiniStat
          label="Da spedire"
          value={formatNumber(daSpedire ?? 0)}
          icon={Truck}
          accent={ACCENT}
          hint="In preparazione o pronti"
        />
        <MiniStat
          label="Revenue del mese"
          value={formatEurFromCents(revenueMese)}
          icon={Wallet}
          accent={ACCENT}
        />
        <MiniStat
          label="Prodotti esauriti"
          value={formatNumber(nonDisponibili.length)}
          icon={PackageX}
          accent={ACCENT}
          hint="Non disponibili"
        />
      </StatGrid>

      <div className="grid gap-3 lg:grid-cols-2">
        <CardList
          title="Ultimi ordini ricevuti"
          description="Le 5 transazioni più recenti."
          accent={ACCENT}
          href="/dashboard/shop"
          isEmpty={ordini.length === 0}
          emptyText="Nessun ordine ancora ricevuto."
        >
          {ordini.map((o) => {
            const utente = o.users
              ? [o.users.nome, o.users.cognome].filter(Boolean).join(" ") ||
                o.users.email
              : "—";
            return (
              <ListRow
                key={o.id}
                primary={shopsNomeById.get(o.shop_id) ?? "Shop"}
                secondary={`${utente} · ${formatDateTime(o.created_at)} · ${o.stato.replace(/_/g, " ")}`}
                trailing={formatEurFromCents(o.totale_cents)}
                href={`/dashboard/shop/${o.shop_id}/ordini`}
              />
            );
          })}
        </CardList>

        <CardList
          title="Prodotti esauriti"
          description="Da rifornire o riattivare."
          accent={ACCENT}
          href="/dashboard/shop"
          isEmpty={nonDisponibili.length === 0}
          emptyText="Tutti i prodotti sono disponibili."
        >
          {nonDisponibili.map((p) => (
            <ListRow
              key={p.id}
              primary={p.nome}
              secondary={shopsNomeById.get(p.shop_id) ?? "Shop"}
              trailing="Esaurito"
              href={`/dashboard/shop/${p.shop_id}`}
            />
          ))}
        </CardList>
      </div>
    </BlockShell>
  );
}
