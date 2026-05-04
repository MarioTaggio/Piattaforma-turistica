import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin, Plus, Ticket } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  formatDateTime,
  formatEurFromCents,
  formatNumber,
} from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "I miei eventi — Piattaforma Turistica",
};

type EventoRow = {
  id: string;
  titolo: string;
  data_inizio: string;
  luogo: string;
  citta: string | null;
  prezzo_cents: number;
  posti_totali: number;
  posti_disponibili: number;
  immagine_url: string | null;
  stato: string;
};

export default async function EventiListPage() {
  const user = await requireRole("gestore_eventi");
  const supabase = await createClient();

  const { data } = await supabase
    .from("eventi")
    .select(
      "id, titolo, data_inizio, luogo, citta, prezzo_cents, posti_totali, posti_disponibili, immagine_url, stato",
    )
    .eq("gestore_id", user.id)
    .order("data_inizio", { ascending: false });

  const eventi = (data ?? []) as EventoRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="I tuoi eventi"
        subtitle="Crea, pubblica e monitora gli eventi che organizzi."
        actions={
          <Button
            render={<Link href="/dashboard/eventi/nuovo" />}
            className="rounded-xl bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="mr-1.5 size-4" />
            Nuovo evento
          </Button>
        }
      />

      {eventi.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nessun evento creato"
          description="Crea il tuo primo evento per iniziare a vendere biglietti sulla piattaforma."
          action={
            <Button
              render={<Link href="/dashboard/eventi/nuovo" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="mr-1.5 size-4" />
              Crea il primo evento
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {eventi.map((e) => {
            const venduti = e.posti_totali - e.posti_disponibili;
            return (
              <Link
                key={e.id}
                href={`/dashboard/eventi/${e.id}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-video bg-muted">
                  {e.immagine_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={e.immagine_url}
                      alt={e.titolo}
                      className="size-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-muted-foreground">
                      <CalendarDays className="size-10" />
                    </div>
                  )}
                  <div className="absolute left-3 top-3">
                    <StatusBadge kind="pubblicazione" value={e.stato} />
                  </div>
                </div>

                <div className="flex flex-1 flex-col gap-2 p-5">
                  <h3 className="line-clamp-2 text-base font-semibold">
                    {e.titolo}
                  </h3>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" />
                      {formatDateTime(e.data_inizio)}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" />
                      {e.luogo}
                      {e.citta ? `, ${e.citta}` : ""}
                    </li>
                  </ul>
                  <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Ticket className="size-3.5" />
                      {formatNumber(venduti)}/{formatNumber(e.posti_totali)}
                    </span>
                    <span className="font-semibold text-foreground">
                      {e.prezzo_cents === 0
                        ? "Gratuito"
                        : formatEurFromCents(e.prezzo_cents)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

