import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Clock } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import {
  formatDate,
  formatDuration,
  formatNumber,
} from "@/lib/utils/format";
import { PageHeader } from "@/components/dashboard/page-header";

import { CoursePlayer, type Lezione } from "./course-player";

export const metadata: Metadata = {
  title: "Riproduci corso — Piattaforma Turistica",
};

export default async function CorsoDetailPage({
  params,
}: {
  params: Promise<{ corsoId: string }>;
}) {
  const user = await requireUser();
  const { corsoId } = await params;

  const supabase = await createClient();

  // Server-side ownership check: did this user buy this corso?
  const { data: acquisto } = await supabase
    .from("acquisti_video")
    .select("id, created_at")
    .eq("utente_id", user.id)
    .eq("corso_id", corsoId)
    .maybeSingle();

  if (!acquisto) {
    // Not purchased — bounce back to listing rather than 404,
    // gives clearer UX than "not found".
    redirect("/dashboard/miei-video");
  }

  const [{ data: corsoRow }, { data: lezioniRows }] = await Promise.all([
    supabase
      .from("corsi")
      .select("titolo, descrizione, immagine_copertina, livello, durata_totale_secondi")
      .eq("id", corsoId)
      .single(),
    supabase
      .from("video_lezioni")
      .select(
        "id, titolo, descrizione, video_url, durata_secondi, ordine, anteprima_gratuita",
      )
      .eq("corso_id", corsoId)
      .order("ordine", { ascending: true }),
  ]);

  if (!corsoRow) notFound();

  const corso = corsoRow as {
    titolo: string;
    descrizione: string | null;
    immagine_copertina: string | null;
    livello: string | null;
    durata_totale_secondi: number | null;
  };

  const lezioni = (lezioniRows ?? []) as unknown as Lezione[];

  return (
    <div className="space-y-6">
      <Link
        href="/dashboard/miei-video"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Torna ai miei video
      </Link>

      <PageHeader
        title={corso.titolo}
        subtitle={corso.descrizione ?? undefined}
        actions={
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {corso.livello && (
              <span className="rounded-full bg-muted px-2.5 py-0.5">
                {corso.livello}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-3.5" />
              {formatNumber(lezioni.length)} lezion
              {lezioni.length === 1 ? "e" : "i"}
            </span>
            {corso.durata_totale_secondi != null && (
              <span className="flex items-center gap-1.5">
                <Clock className="size-3.5" />
                {formatDuration(corso.durata_totale_secondi)}
              </span>
            )}
            <span>· acquistato {formatDate(acquisto.created_at)}</span>
          </div>
        }
      />

      <CoursePlayer lezioni={lezioni} />
    </div>
  );
}
