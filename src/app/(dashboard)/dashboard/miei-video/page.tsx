import type { Metadata } from "next";
import Link from "next/link";
import { PlayCircle, Clock, BookOpen, Compass } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate,
  formatDuration,
  formatNumber,
} from "@/lib/utils/format";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "I miei video — Piattaforma Turistica",
};

type AcquistoRow = {
  id: string;
  created_at: string;
  corso_id: string;
  corsi: {
    id: string;
    titolo: string;
    descrizione: string | null;
    immagine_copertina: string | null;
    livello: string | null;
    durata_totale_secondi: number | null;
  } | null;
};

export default async function MieiVideoPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const tVideo = await getTranslations("video");

  const { data } = await supabase
    .from("acquisti_video")
    .select(
      `id, created_at, corso_id,
       corsi ( id, titolo, descrizione, immagine_copertina, livello, durata_totale_secondi )`,
    )
    .eq("utente_id", user.id)
    .order("created_at", { ascending: false });

  const acquisti = (data ?? []) as unknown as AcquistoRow[];

  // For each corso, count lessons. RLS lets us read video_lezioni only for
  // corsi we've purchased — so this just works.
  const lezioniCountByCorso = new Map<string, number>();
  if (acquisti.length > 0) {
    const corsoIds = acquisti
      .map((a) => a.corsi?.id)
      .filter((x): x is string => !!x);
    if (corsoIds.length > 0) {
      const { data: lezioni } = await supabase
        .from("video_lezioni")
        .select("corso_id")
        .in("corso_id", corsoIds);
      for (const row of (lezioni ?? []) as { corso_id: string }[]) {
        lezioniCountByCorso.set(
          row.corso_id,
          (lezioniCountByCorso.get(row.corso_id) ?? 0) + 1,
        );
      }
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={tVideo("title")}
        subtitle={tVideo("subtitle")}
      />

      {acquisti.length === 0 ? (
        <EmptyState
          icon={PlayCircle}
          title={tVideo("noCourses")}
          description={tVideo("noCoursesDescription")}
          action={
            <Button
              render={<Link href="/video" />}
              className="rounded-xl bg-brand-600 hover:bg-brand-700"
            >
              <Compass className="mr-1.5 size-4" />
              {tVideo("exploreCourses")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {acquisti.map((a) => {
            const c = a.corsi;
            const lezioniCount = c ? lezioniCountByCorso.get(c.id) ?? 0 : 0;
            return (
              <article
                key={a.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:shadow-md"
              >
                <div className="relative aspect-video bg-muted">
                  {c?.immagine_copertina ? (
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
                  {c?.livello && (
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-foreground backdrop-blur">
                      {c.livello}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="space-y-1">
                    <h3 className="line-clamp-2 text-base font-semibold">
                      {c?.titolo ?? "Corso eliminato"}
                    </h3>
                    {c?.descrizione && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {c.descrizione}
                      </p>
                    )}
                  </div>

                  <ul className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <li className="flex items-center gap-1.5">
                      <BookOpen className="size-3.5" />
                      {formatNumber(lezioniCount)} {tVideo("lessons")}
                    </li>
                    {c?.durata_totale_secondi != null && (
                      <li className="flex items-center gap-1.5">
                        <Clock className="size-3.5" />
                        {formatDuration(c.durata_totale_secondi)}
                      </li>
                    )}
                  </ul>

                  <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
                    <span className="text-[11px] text-muted-foreground">
                      {tVideo("purchased")} {formatDate(a.created_at)}
                    </span>
                    {c && (
                      <Button
                        render={<Link href={`/dashboard/miei-video/${c.id}`} />}
                        size="sm"
                        className="rounded-xl bg-brand-600 hover:bg-brand-700"
                      >
                        <PlayCircle className="mr-1.5 size-4" />
                        {tVideo("resume")}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
