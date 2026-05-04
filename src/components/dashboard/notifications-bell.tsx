"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { Bell, Check, CheckCheck } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import type { Notifica } from "@/lib/notifications/queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

type Props = {
  userId: string;
  initialNotifications: Notifica[];
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

const tipoStyle: Record<Notifica["tipo"], string> = {
  info: "bg-sky-100 text-sky-700",
  successo: "bg-emerald-100 text-emerald-700",
  avviso: "bg-amber-100 text-amber-700",
  errore: "bg-rose-100 text-rose-700",
};

export function NotificationsBell({
  userId,
  initialNotifications,
  initialUnreadCount,
}: Props) {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifiche:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifiche",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const incoming = payload.new as Notifica;
          setNotifications((prev) => [incoming, ...prev].slice(0, 15));
          if (!incoming.letta) setUnreadCount((c) => c + 1);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifiche",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as Notifica;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n)),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  async function markAsRead(id: string) {
    // Optimistic
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, letta: true } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    const supabase = createClient();
    await supabase.from("notifiche").update({ letta: true }).eq("id", id);
  }

  async function markAllAsRead() {
    const ids = notifications.filter((n) => !n.letta).map((n) => n.id);
    if (ids.length === 0) return;

    startTransition(() => {
      setNotifications((prev) => prev.map((n) => ({ ...n, letta: true })));
      setUnreadCount(0);
    });

    const supabase = createClient();
    await supabase.from("notifiche").update({ letta: true }).in("id", ids);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="relative inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-muted"
        aria-label="Notifiche"
      >
        <Bell className="size-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 p-0"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold">Notifiche</p>
            <p className="text-xs text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} non lett${unreadCount === 1 ? "a" : "e"}`
                : "Tutto in pari"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-brand-700 hover:text-brand-800"
              onClick={markAllAsRead}
            >
              <CheckCheck className="mr-1 size-3.5" />
              Segna tutte
            </Button>
          )}
        </div>

        <div className="border-t" />

        <ScrollArea className="max-h-96">
          {notifications.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              Nessuna notifica
            </div>
          ) : (
            <ul className="py-1">
              {notifications.map((n) => {
                const body = (
                  <div className="flex items-start gap-3 px-4 py-3">
                    <span
                      className={cn(
                        "mt-0.5 grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
                        tipoStyle[n.tipo],
                      )}
                      aria-hidden
                    >
                      {n.tipo === "info"
                        ? "i"
                        : n.tipo === "successo"
                          ? "✓"
                          : n.tipo === "avviso"
                            ? "!"
                            : "×"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            n.letta ? "text-foreground/80" : "font-semibold",
                          )}
                        >
                          {n.titolo}
                        </p>
                        {!n.letta && (
                          <span
                            aria-hidden
                            className="size-2 shrink-0 rounded-full bg-brand-600"
                          />
                        )}
                      </div>
                      {n.messaggio && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                          {n.messaggio}
                        </p>
                      )}
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.letta && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void markAsRead(n.id);
                        }}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                        aria-label="Segna come letta"
                      >
                        <Check className="size-3.5" />
                      </button>
                    )}
                  </div>
                );

                return (
                  <li key={n.id} className="hover:bg-muted/50">
                    {n.link ? (
                      <Link
                        href={n.link}
                        onClick={() => !n.letta && markAsRead(n.id)}
                        className="block"
                      >
                        {body}
                      </Link>
                    ) : (
                      body
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
