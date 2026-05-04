"use client";

import { useState } from "react";
import { Check, PlayCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils/format";

export type Lezione = {
  id: string;
  titolo: string;
  descrizione: string | null;
  video_url: string;
  durata_secondi: number;
  ordine: number;
  anteprima_gratuita: boolean;
};

type Props = {
  lezioni: Lezione[];
};

export function CoursePlayer({ lezioni }: Props) {
  const [activeId, setActiveId] = useState(lezioni[0]?.id ?? null);
  const active = lezioni.find((l) => l.id === activeId) ?? lezioni[0];

  if (!active) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center text-sm text-muted-foreground">
        Questo corso non ha ancora lezioni disponibili.
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-3">
        <div className="overflow-hidden rounded-2xl bg-black shadow-sm">
          <video
            key={active.id}
            src={active.video_url}
            controls
            controlsList="nodownload"
            playsInline
            className="aspect-video w-full"
          />
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h2 className="text-lg font-semibold">{active.titolo}</h2>
          {active.descrizione && (
            <p className="mt-2 text-sm text-muted-foreground">
              {active.descrizione}
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Durata: {formatDuration(active.durata_secondi)}
          </p>
        </div>
      </div>

      <aside className="lg:col-span-2">
        <div className="rounded-2xl border border-border bg-card">
          <header className="border-b border-border px-5 py-4">
            <h3 className="text-sm font-semibold">Indice del corso</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {lezioni.length} lezion{lezioni.length === 1 ? "e" : "i"}
            </p>
          </header>
          <ol className="divide-y divide-border">
            {lezioni.map((l, i) => {
              const isActive = l.id === active.id;
              return (
                <li key={l.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(l.id)}
                    className={cn(
                      "flex w-full items-start gap-3 px-5 py-3 text-left transition",
                      isActive ? "bg-brand-50" : "hover:bg-muted/60",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        isActive
                          ? "bg-brand-600 text-white"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {isActive ? (
                        <PlayCircle className="size-4" />
                      ) : (
                        i + 1
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          "truncate text-sm",
                          isActive ? "font-semibold text-brand-700" : "text-foreground",
                        )}
                      >
                        {l.titolo}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {formatDuration(l.durata_secondi)}
                        {l.anteprima_gratuita && (
                          <span className="ml-2 inline-flex items-center gap-1 text-emerald-700">
                            <Check className="size-3" /> anteprima
                          </span>
                        )}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </aside>
    </div>
  );
}
