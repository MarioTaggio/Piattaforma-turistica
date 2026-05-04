import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Store } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "I miei shop — Piattaforma Turistica",
};

type ShopRow = {
  id: string;
  nome: string;
  citta: string | null;
  immagini: string[];
  stato: string;
};

export default async function ShopListPage() {
  const user = await requireRole("gestore_shop");
  const supabase = await createClient();

  const { data } = await supabase
    .from("shops")
    .select("id, nome, citta, immagini, stato")
    .eq("gestore_id", user.id)
    .order("nome", { ascending: true });

  const shops = (data ?? []) as ShopRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="I tuoi shop"
        subtitle="Crea uno o più shop e gestisci il catalogo dei prodotti."
        actions={
          <Button
            render={<Link href="/dashboard/shop/nuovo" />}
            className="rounded-xl bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="mr-1.5 size-4" />
            Nuovo shop
          </Button>
        }
      />

      {shops.length === 0 ? (
        <EmptyState
          icon={Store}
          title="Nessuno shop ancora"
          description="Crea il primo shop per iniziare a vendere i tuoi prodotti online."
          action={
            <Button
              render={<Link href="/dashboard/shop/nuovo" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="mr-1.5 size-4" />
              Crea il primo shop
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shops.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/shop/${s.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-video bg-muted">
                {s.immagini[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={s.immagini[0]}
                    alt={s.nome}
                    className="size-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <Store className="size-10" />
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <StatusBadge kind="pubblicazione" value={s.stato} />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-1 p-5">
                <h3 className="line-clamp-2 text-base font-semibold">{s.nome}</h3>
                {s.citta && (
                  <p className="text-xs text-muted-foreground">{s.citta}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
