import type { Metadata } from "next";
import Link from "next/link";
import { Hotel, MapPin, Plus, Star } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Le mie strutture — Piattaforma Turistica",
};

type StrutturaRow = {
  id: string;
  nome: string;
  citta: string;
  indirizzo: string;
  stelle: number | null;
  immagini: string[];
  stato: string;
};

export default async function BnbListPage() {
  const user = await requireRole("gestore_bnb");
  const supabase = await createClient();

  const { data } = await supabase
    .from("strutture")
    .select("id, nome, citta, indirizzo, stelle, immagini, stato")
    .eq("gestore_id", user.id)
    .order("nome", { ascending: true });

  const strutture = (data ?? []) as StrutturaRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Le tue strutture B&B"
        subtitle="Gestisci strutture, camere e prenotazioni."
        actions={
          <Button
            render={<Link href="/dashboard/bnb/nuova" />}
            className="rounded-xl bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="mr-1.5 size-4" />
            Nuova struttura
          </Button>
        }
      />

      {strutture.length === 0 ? (
        <EmptyState
          icon={Hotel}
          title="Nessuna struttura ancora"
          description="Crea la tua prima struttura per iniziare ad accettare prenotazioni."
          action={
            <Button
              render={<Link href="/dashboard/bnb/nuova" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="mr-1.5 size-4" />
              Crea la prima struttura
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {strutture.map((s) => (
            <Link
              key={s.id}
              href={`/dashboard/bnb/${s.id}`}
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
                    <Hotel className="size-10" />
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <StatusBadge kind="pubblicazione" value={s.stato} />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="line-clamp-2 text-base font-semibold">
                    {s.nome}
                  </h3>
                  {s.stelle != null && (
                    <span className="flex shrink-0 items-center gap-0.5 text-xs text-amber-500">
                      {Array.from({ length: s.stelle }).map((_, i) => (
                        <Star key={i} className="size-3 fill-current" />
                      ))}
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {s.indirizzo}, {s.citta}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
