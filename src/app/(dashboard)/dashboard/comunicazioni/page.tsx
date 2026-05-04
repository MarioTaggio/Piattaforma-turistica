import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/dashboard/empty-state";
import { formatDateTime } from "@/lib/utils/format";
import { TIPO_MITTENTE_LABEL } from "@/lib/comunicazioni/labels";

export const metadata: Metadata = {
  title: "Comunicazioni — Piattaforma Turistica",
};

type Row = {
  id: string;
  oggetto: string;
  testo: string;
  letta: boolean;
  tipo_mittente: string | null;
  entita_nome: string | null;
  created_at: string;
  mittente: { nome: string | null; cognome: string | null } | null;
};

export default async function ComunicazioniPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("comunicazioni")
    .select(
      `id, oggetto, testo, letta, tipo_mittente, entita_nome, created_at,
       mittente:mittente_id ( nome, cognome )`,
    )
    .eq("destinatario_id", user.id)
    .order("created_at", { ascending: false });

  const comunicazioni = (data ?? []) as unknown as Row[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Comunicazioni"
        subtitle="Tutti i messaggi che hai ricevuto dai gestori dei servizi che hai prenotato o acquistato."
      />

      {comunicazioni.length === 0 ? (
        <EmptyState
          icon={Mail}
          title="Nessuna comunicazione"
          description="Quando un gestore ti scriverà la troverai qui."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {comunicazioni.map((c) => {
              const senderName = [c.mittente?.nome, c.mittente?.cognome]
                .filter(Boolean)
                .join(" ")
                .trim();
              const moduloLabel = c.tipo_mittente
                ? TIPO_MITTENTE_LABEL[c.tipo_mittente] ?? c.tipo_mittente
                : "";
              const senderLine = c.entita_nome
                ? `${c.entita_nome}${moduloLabel ? ` — ${moduloLabel}` : ""}`
                : senderName ||
                  (moduloLabel ? `Gestore ${moduloLabel}` : "Gestore");
              const preview = c.testo.replace(/\s+/g, " ").slice(0, 140);

              return (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/comunicazioni/${c.id}`}
                    className="flex items-start gap-4 px-5 py-4 transition hover:bg-muted/40"
                  >
                    <div
                      className={
                        "mt-1.5 size-2 shrink-0 rounded-full " +
                        (c.letta ? "bg-transparent" : "bg-brand-600")
                      }
                      aria-label={c.letta ? "Letta" : "Non letta"}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="min-w-0">
                          <h3
                            className={
                              "truncate text-sm " +
                              (c.letta
                                ? "text-foreground/80"
                                : "font-semibold text-foreground")
                            }
                          >
                            {c.oggetto}
                          </h3>
                          <p className="truncate text-xs text-muted-foreground">
                            {senderLine}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {formatDateTime(c.created_at)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                        {preview}
                        {c.testo.length > preview.length ? "…" : ""}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
