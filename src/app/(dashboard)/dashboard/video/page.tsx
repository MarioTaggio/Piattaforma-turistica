import type { Metadata } from "next";
import Link from "next/link";
import { PlayCircle, Plus, Clock } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import {
  formatDuration,
  formatEurFromCents,
} from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "I miei corsi — Piattaforma Turistica",
};

type CorsoRow = {
  id: string;
  titolo: string;
  prezzo_cents: number;
  immagine_copertina: string | null;
  livello: string | null;
  durata_totale_secondi: number | null;
  stato: string;
};

export default async function VideoListPage() {
  const user = await requireRole("gestore_video");
  const supabase = await createClient();

  const { data } = await supabase
    .from("corsi")
    .select(
      "id, titolo, prezzo_cents, immagine_copertina, livello, durata_totale_secondi, stato",
    )
    .eq("gestore_id", user.id)
    .order("created_at", { ascending: false });

  const corsi = (data ?? []) as CorsoRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="I tuoi corsi video"
        subtitle="Crea corsi, aggiungi lezioni e monitora le vendite."
        actions={
          <Button
            render={<Link href="/dashboard/video/nuovo" />}
            className="rounded-xl bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="mr-1.5 size-4" />
            Nuovo corso
          </Button>
        }
      />

      {corsi.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          title="Nessun corso creato"
          description="Crea il tuo primo corso per iniziare a vendere video lezioni."
          action={
            <Button
              render={<Link href="/dashboard/video/nuovo" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="mr-1.5 size-4" />
              Crea il primo corso
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {corsi.map((c) => (
            <Link
              key={c.id}
              href={`/dashboard/video/${c.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-video bg-muted">
                {c.immagine_copertina ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.immagine_copertina}
                    alt={c.titolo}
                    className="size-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <PlayCircle className="size-10" />
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <StatusBadge kind="pubblicazione" value={c.stato} />
                </div>
                {c.livello && (
                  <span className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur">
                    {c.livello}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="line-clamp-2 text-base font-semibold">
                  {c.titolo}
                </h3>
                <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3.5" />
                    {formatDuration(c.durata_totale_secondi ?? 0)}
                  </span>
                  <span className="font-semibold text-foreground">
                    {c.prezzo_cents === 0
                      ? "Gratuito"
                      : formatEurFromCents(c.prezzo_cents)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
