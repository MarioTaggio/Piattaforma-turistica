"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCheck, ChevronDown, Mail, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { ComunicazioneRow } from "@/lib/comunicazioni/queries";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TIPO_MITTENTE_LABEL } from "@/lib/comunicazioni/labels";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  initialItems: ComunicazioneRow[];
  initialUnreadCount: number;
};

const RELATIVE = new Intl.RelativeTimeFormat("it", { numeric: "auto" });

function timeAgo(iso: string) {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return "ora";
  const minutes = Math.floor(diffSec / 60);
  if (minutes < 60) return RELATIVE.format(-minutes, "minute");
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return RELATIVE.format(-hours, "hour");
  const days = Math.floor(hours / 24);
  if (days < 30) return RELATIVE.format(-days, "day");
  const months = Math.floor(days / 30);
  return RELATIVE.format(-months, "month");
}

function senderLabel(c: ComunicazioneRow): string {
  const moduloLabel = c.tipo_mittente
    ? TIPO_MITTENTE_LABEL[c.tipo_mittente] ?? c.tipo_mittente
    : "";
  if (c.entita_nome) {
    return moduloLabel
      ? `${c.entita_nome} — ${moduloLabel}`
      : c.entita_nome;
  }
  const senderName = [c.mittente?.nome, c.mittente?.cognome]
    .filter(Boolean)
    .join(" ")
    .trim();
  return senderName || (moduloLabel ? `Gestore ${moduloLabel}` : "Gestore");
}

function senderInitials(c: ComunicazioneRow): string {
  if (c.entita_nome) {
    const w = c.entita_nome.split(/\s+/).filter(Boolean).slice(0, 2);
    return w.map((s) => s[0]?.toUpperCase()).join("") || "?";
  }
  const fromName = [c.mittente?.nome, c.mittente?.cognome]
    .filter(Boolean)
    .map((s) => (s ?? "")[0]?.toUpperCase())
    .join("");
  return fromName || "G";
}

export function ComunicazioniBell({
  userId,
  initialItems,
  initialUnreadCount,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  // Realtime: nuove comunicazioni in tempo reale.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`comunicazioni:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comunicazioni",
          filter: `destinatario_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = {
            ...(payload.new as Omit<ComunicazioneRow, "mittente">),
            mittente: null,
          } as ComunicazioneRow;
          setItems((prev) => [incoming, ...prev].slice(0, 15));
          if (!incoming.letta) setUnreadCount((c) => c + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "comunicazioni",
          filter: `destinatario_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Omit<ComunicazioneRow, "mittente">;
          setItems((prev) =>
            prev.map((c) =>
              c.id === updated.id
                ? { ...c, ...updated, mittente: c.mittente }
                : c,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((c) => (c.id === id ? { ...c, letta: true } : c)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
    const supabase = createClient();
    await supabase.from("comunicazioni").update({ letta: true }).eq("id", id);
  }

  async function markAllRead() {
    const ids = items.filter((c) => !c.letta).map((c) => c.id);
    if (ids.length === 0) return;
    startTransition(() => {
      setItems((prev) => prev.map((c) => ({ ...c, letta: true })));
      setUnreadCount(0);
    });
    const supabase = createClient();
    await supabase.from("comunicazioni").update({ letta: true }).in("id", ids);
  }

  function toggleExpand(c: ComunicazioneRow) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(c.id)) next.delete(c.id);
      else next.add(c.id);
      return next;
    });
    if (!c.letta) void markRead(c.id);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {/* Trigger: bottone icona busta. `nativeButton={true}` è obbligatorio
          in Base UI quando il render produce un <button> nativo. */}
      <SheetTrigger
        nativeButton={true}
        render={
          <button
            type="button"
            className="relative inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-muted"
            aria-label="Comunicazioni"
          />
        }
      >
        <Mail className="size-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full px-1 text-[10px] font-semibold text-white"
            style={{ background: "#1B4332" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </SheetTrigger>

      <SheetContent
        side="right"
        showCloseButton={false}
        // Override la default del componente (sm:max-w-sm = 384px) per
        // arrivare a max-w-md = 448px come da specifica.
        className="z-50 flex w-full flex-col gap-0 p-0 sm:!max-w-md"
      >
        {/* Header verde scuro */}
        <header
          className="flex items-start justify-between gap-3 border-b border-border px-5 py-4 text-white"
          style={{ background: "#1B4332" }}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold">Messaggi</h2>
            <p className="text-xs text-white/80">
              {unreadCount > 0
                ? `${unreadCount} non lett${unreadCount === 1 ? "a" : "e"}`
                : "Nessun messaggio non letto"}
            </p>
          </div>
          {unreadCount > 0 && (
            <span
              className="grid min-w-6 place-items-center rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold"
              aria-hidden
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1 text-white/80 hover:bg-white/15 hover:text-white"
            aria-label="Chiudi"
          >
            <X className="size-4" />
          </button>
        </header>

        {/* Lista scrollabile */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              Nessuna comunicazione
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((c) => {
                const sender = senderLabel(c);
                const isOpen = expanded.has(c.id);
                const preview = c.testo.replace(/\s+/g, " ").slice(0, 90);
                const initials = senderInitials(c);
                return (
                  <li
                    key={c.id}
                    className={cn(
                      !c.letta && "bg-muted/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleExpand(c)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-muted/60"
                      aria-expanded={isOpen}
                    >
                      {/* Avatar/icona mittente */}
                      <span
                        className="grid size-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
                        style={{ background: "#1B4332" }}
                        aria-hidden
                      >
                        {initials}
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <p
                            className={cn(
                              "truncate text-xs",
                              c.letta
                                ? "text-muted-foreground"
                                : "font-semibold text-foreground",
                            )}
                          >
                            {sender}
                          </p>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {timeAgo(c.created_at)}
                          </span>
                        </div>
                        <p
                          className={cn(
                            "truncate text-sm",
                            c.letta
                              ? "text-foreground/80"
                              : "font-semibold text-foreground",
                          )}
                        >
                          {c.oggetto}
                        </p>
                        {!isOpen && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {preview}
                            {c.testo.length > preview.length ? "…" : ""}
                          </p>
                        )}
                      </div>

                      <ChevronDown
                        className={cn(
                          "mt-2 size-4 shrink-0 text-muted-foreground transition-transform",
                          isOpen && "rotate-180",
                        )}
                      />
                    </button>

                    {/* Espansione inline */}
                    {isOpen && (
                      <div className="border-t border-border bg-card px-4 py-3 pl-16">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                          {c.testo}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>
                            {new Date(c.created_at).toLocaleString("it-IT")}
                          </span>
                          {c.link && (
                            <a
                              href={c.link}
                              className="font-medium hover:underline"
                              style={{ color: "#1B4332" }}
                            >
                              Apri il riferimento →
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer "Segna tutte come lette" */}
        {unreadCount > 0 && (
          <footer className="border-t border-border bg-card px-4 py-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-xl"
              onClick={markAllRead}
            >
              <CheckCheck className="mr-1.5 size-3.5" />
              Segna tutte come lette
            </Button>
          </footer>
        )}
      </SheetContent>
    </Sheet>
  );
}
