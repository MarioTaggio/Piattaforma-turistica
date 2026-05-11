"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import {
  CalendarCheck,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Ticket,
  User as UserIcon,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/actions";

import { NAV_LINKS } from "./nav-links";

type MenuUser = {
  email: string;
  nome: string | null;
  cognome: string | null;
  avatar_url: string | null;
};

export function MobileMenu({ user }: { user: MenuUser | null }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const fullName = user
    ? [user.nome, user.cognome].filter(Boolean).join(" ").trim()
    : "";
  const display = user ? fullName || user.email : "";
  const initials = user
    ? ((fullName || user.email)[0] ?? "?").toUpperCase()
    : "?";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="grid size-9 place-items-center rounded-lg text-foreground/80 hover:bg-muted lg:hidden"
        aria-label={t("openMenu")}
      >
        <Menu className="size-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            aria-label={t("closeMenu")}
          />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {t("menu")}
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid size-8 place-items-center rounded-lg hover:bg-muted"
                aria-label={t("closeMenu")}
              >
                <X className="size-4" />
              </button>
            </div>

            {user && (
              <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-muted/30 p-3">
                <div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-50 text-sm font-semibold text-brand-700 ring-1 ring-brand-100">
                  {user.avatar_url ? (
                    <Image
                      src={user.avatar_url}
                      alt={display}
                      width={40}
                      height={40}
                      className="size-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{display}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </div>
            )}

            <nav className="mt-6 flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-brand-50 hover:text-brand-700"
                >
                  {t(l.key)}
                </Link>
              ))}
            </nav>

            {user && (
              <nav className="mt-4 flex flex-col gap-1 border-t border-border pt-4">
                <Link
                  href="/dashboard/profilo"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-brand-50 hover:text-brand-700"
                >
                  <UserIcon className="size-4" />
                  {t("myProfile")}
                </Link>
                <Link
                  href="/dashboard/biglietti"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-brand-50 hover:text-brand-700"
                >
                  <Ticket className="size-4" />
                  {t("myTickets")}
                </Link>
                <Link
                  href="/dashboard/prenotazioni"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground/80 hover:bg-brand-50 hover:text-brand-700"
                >
                  <CalendarCheck className="size-4" />
                  {t("myBookings")}
                </Link>
              </nav>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-6">
              {user ? (
                <>
                  <Button
                    className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
                    render={
                      <Link
                        href="/dashboard"
                        onClick={() => setOpen(false)}
                      />
                    }
                  >
                    <LayoutDashboard className="mr-1.5 size-4" />
                    {t("dashboard")}
                  </Button>
                  <form action={signOut}>
                    <Button
                      type="submit"
                      variant="ghost"
                      className="w-full justify-start rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <LogOut className="mr-1.5 size-4" />
                      {t("logout")}
                    </Button>
                  </form>
                </>
              ) : (
                <Button
                  className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
                  render={<Link href="/login" onClick={() => setOpen(false)} />}
                >
                  <LogIn className="mr-1.5 size-4" />
                  {t("login")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
