import type { Metadata } from "next";
import Link from "next/link";
import {
  UtensilsCrossed,
  MapPin,
  Phone,
  Plus,
} from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "I miei ristoranti — Piattaforma Turistica",
};

type RistoranteRow = {
  id: string;
  nome: string;
  citta: string;
  indirizzo: string;
  telefono: string | null;
  tipo_cucina: string | null;
  immagini: string[];
  stato: string;
};

export default async function RistorantiListPage() {
  const user = await requireRole("gestore_ristorante");
  const supabase = await createClient();

  const { data } = await supabase
    .from("ristoranti")
    .select("id, nome, citta, indirizzo, telefono, tipo_cucina, immagini, stato")
    .eq("gestore_id", user.id)
    .order("nome", { ascending: true });

  const ristoranti = (data ?? []) as RistoranteRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="I tuoi ristoranti"
        subtitle="Gestisci ristoranti, tavoli e prenotazioni."
        actions={
          <Button
            render={<Link href="/dashboard/ristoranti/nuovo" />}
            className="rounded-xl bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="mr-1.5 size-4" />
            Nuovo ristorante
          </Button>
        }
      />

      {ristoranti.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="Nessun ristorante ancora"
          description="Crea il tuo primo ristorante per accettare prenotazioni di tavoli."
          action={
            <Button
              render={<Link href="/dashboard/ristoranti/nuovo" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="mr-1.5 size-4" />
              Crea il primo ristorante
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {ristoranti.map((r) => (
            <Link
              key={r.id}
              href={`/dashboard/ristoranti/${r.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-video bg-muted">
                {r.immagini[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={r.immagini[0]}
                    alt={r.nome}
                    className="size-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <UtensilsCrossed className="size-10" />
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <StatusBadge kind="pubblicazione" value={r.stato} />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="line-clamp-2 text-base font-semibold">
                  {r.nome}
                </h3>
                {r.tipo_cucina && (
                  <p className="text-xs uppercase tracking-wider text-brand-700">
                    {r.tipo_cucina}
                  </p>
                )}
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <MapPin className="size-3.5" />
                    {r.indirizzo}, {r.citta}
                  </li>
                  {r.telefono && (
                    <li className="flex items-center gap-1.5">
                      <Phone className="size-3.5" />
                      {r.telefono}
                    </li>
                  )}
                </ul>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
