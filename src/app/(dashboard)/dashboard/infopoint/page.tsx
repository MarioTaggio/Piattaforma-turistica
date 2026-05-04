import type { Metadata } from "next";
import Link from "next/link";
import { Landmark, MapPin, Plus } from "lucide-react";

import { requireRole } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Le mie attrazioni — Piattaforma Turistica",
};

type AttrazioneRow = {
  id: string;
  nome: string;
  citta: string;
  indirizzo: string;
  categoria: string | null;
  immagini: string[];
  stato: string;
};

export default async function InfopointListPage() {
  const user = await requireRole("gestore_infopoint");
  const supabase = await createClient();

  const { data } = await supabase
    .from("attrazioni")
    .select("id, nome, citta, indirizzo, categoria, immagini, stato")
    .eq("gestore_id", user.id)
    .order("nome", { ascending: true });

  const attrazioni = (data ?? []) as AttrazioneRow[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Le tue attrazioni"
        subtitle="Gestisci attrazioni, tour virtuali e visite guidate."
        actions={
          <Button
            render={<Link href="/dashboard/infopoint/nuova" />}
            className="rounded-xl bg-brand-600 hover:bg-brand-700"
          >
            <Plus className="mr-1.5 size-4" />
            Nuova attrazione
          </Button>
        }
      />

      {attrazioni.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nessuna attrazione ancora"
          description="Crea la tua prima attrazione per iniziare a offrire visite e tour virtuali."
          action={
            <Button
              render={<Link href="/dashboard/infopoint/nuova" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Plus className="mr-1.5 size-4" />
              Crea la prima attrazione
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {attrazioni.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/infopoint/${a.id}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
            >
              <div className="relative aspect-video bg-muted">
                {a.immagini[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.immagini[0]}
                    alt={a.nome}
                    className="size-full object-cover transition group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-muted-foreground">
                    <Landmark className="size-10" />
                  </div>
                )}
                <div className="absolute left-3 top-3">
                  <StatusBadge kind="pubblicazione" value={a.stato} />
                </div>
              </div>
              <div className="flex flex-1 flex-col gap-2 p-5">
                <h3 className="line-clamp-2 text-base font-semibold">
                  {a.nome}
                </h3>
                {a.categoria && (
                  <p className="text-xs uppercase tracking-wider text-brand-700">
                    {a.categoria}
                  </p>
                )}
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  {a.indirizzo}, {a.citta}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
