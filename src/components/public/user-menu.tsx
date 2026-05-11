"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  Home,
  LayoutDashboard,
  LogOut,
  Ticket,
  User as UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { signOut } from "@/lib/auth/actions";

type Props = {
  user: {
    email: string;
    nome: string | null;
    cognome: string | null;
    avatar_url: string | null;
  };
};

export function UserMenu({ user }: Props) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fullName = [user.nome, user.cognome].filter(Boolean).join(" ").trim();
  const display = fullName || user.email;
  const initials = (fullName || user.email)[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
  }

  const itemClass =
    "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-foreground/90 hover:bg-brand-50 hover:text-brand-700";

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        aria-label={t("account")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="grid size-9 place-items-center overflow-hidden rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100 transition hover:bg-brand-100"
      >
        {user.avatar_url ? (
          <Image
            src={user.avatar_url}
            alt={display}
            width={36}
            height={36}
            className="size-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="animate-in fade-in-0 zoom-in-95 absolute right-0 top-full z-50 mt-2 w-60 origin-top-right overflow-hidden rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {display}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.email}
            </p>
          </div>

          <div className="my-1 h-px bg-border" />

          <Link href="/" onClick={close} className={itemClass}>
            <Home className="size-4" />
            {t("home")}
          </Link>
          <Link
            href="/dashboard"
            onClick={close}
            className={itemClass}
          >
            <LayoutDashboard className="size-4" />
            {t("dashboard")}
          </Link>
          <Link
            href="/dashboard/profilo"
            onClick={close}
            className={itemClass}
          >
            <UserIcon className="size-4" />
            {t("myProfile")}
          </Link>
          <Link
            href="/dashboard/biglietti"
            onClick={close}
            className={itemClass}
          >
            <Ticket className="size-4" />
            {t("myTickets")}
          </Link>
          <Link
            href="/dashboard/prenotazioni"
            onClick={close}
            className={itemClass}
          >
            <CalendarCheck className="size-4" />
            {t("myBookings")}
          </Link>

          <div className="my-1 h-px bg-border" />

          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" />
              {t("logout")}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
