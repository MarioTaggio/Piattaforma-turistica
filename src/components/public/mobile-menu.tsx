"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard, LogIn, Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

import { NAV_LINKS } from "./nav-links";

export function MobileMenu({ loggedIn }: { loggedIn: boolean }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("nav");

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
            <div className="mt-auto pt-6">
              {loggedIn ? (
                <Button
                  className="w-full rounded-xl bg-brand-600 hover:bg-brand-700"
                  render={<Link href="/dashboard" onClick={() => setOpen(false)} />}
                >
                  <LayoutDashboard className="mr-1.5 size-4" />
                  {t("goToDashboard")}
                </Button>
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
