import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail } from "lucide-react";

import { requireUser } from "@/lib/auth/dal";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils/format";
import { TIPO_MITTENTE_LABEL } from "@/lib/comunicazioni/labels";

export const metadata: Metadata = {
  title: "Comunicazione — Piattaforma Turistica",
};

type Row = {
  id: string;
  oggetto: string;
  testo: string;
  letta: boolean;
  tipo_mittente: string | null;
  entita_nome: string | null;
  link: string | null;
  created_at: string;
  destinatario_id: string;
  mittente: { nome: string | null; cognome: string | null; email: string } | null;
};

export default async function ComunicazioneDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("comunicazioni")
    .select(
      `id, oggetto, testo, letta, tipo_mittente, entita_nome, link,
       created_at, destinatario_id,
       mittente:mittente_id ( nome, cognome, email )`,
    )
    .eq("id", id)
    .single();

  const com = data as unknown as Row | null;
  if (!com) notFound();
  if (com.destinatario_id !== user.id) notFound();

  // Mark as read at first view + segna letta anche la notifica correlata.
  if (!com.letta) {
    await supabase
      .from("comunicazioni")
      .update({ letta: true })
      .eq("id", id)
      .eq("destinatario_id", user.id);

    // Best-effort: segna come letta anche la notifica con link a questa pagina.
    // Usa admin per evitare RLS friction.
    const admin = createAdminClient();
    await admin
      .from("notifiche")
      .update({ letta: true })
      .eq("user_id", user.id)
      .eq("link", `/dashboard/comunicazioni/${id}`);
  }

  const senderName = [com.mittente?.nome, com.mittente?.cognome]
    .filter(Boolean)
    .join(" ")
    .trim();
  const moduloLabel = com.tipo_mittente
    ? TIPO_MITTENTE_LABEL[com.tipo_mittente] ?? com.tipo_mittente
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="rounded-xl text-muted-foreground hover:text-foreground"
          render={<Link href="/dashboard/comunicazioni" />}
        >
          <ArrowLeft className="mr-1.5 size-4" />
          Torna alle comunicazioni
        </Button>
      </div>

      <article className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex items-start gap-4 border-b border-border bg-muted/30 px-6 py-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Mail className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold leading-tight">
              {com.oggetto}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {com.entita_nome
                ? `${com.entita_nome}${moduloLabel ? ` — ${moduloLabel}` : ""}`
                : senderName ||
                  (moduloLabel ? `Gestore ${moduloLabel}` : "Gestore")}
            </p>
            {senderName && com.entita_nome && (
              <p className="text-xs text-muted-foreground">
                Inviato da {senderName}
                {com.mittente?.email ? ` · ${com.mittente.email}` : ""}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(com.created_at)}
            </p>
          </div>
        </header>

        <div className="space-y-4 px-6 py-6">
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {com.testo}
          </div>

          {com.link && (
            <div className="border-t border-border pt-4">
              <Button
                size="sm"
                className="rounded-xl bg-brand-600 hover:bg-brand-700"
                render={<Link href={com.link} />}
              >
                Apri il riferimento
              </Button>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}
